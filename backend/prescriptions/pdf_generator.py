import os
import hashlib
from io import BytesIO
from django.conf import settings
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch


def generate_prescription_pdf(prescription):
    media_dir = os.path.join(settings.MEDIA_ROOT, 'prescriptions', 'pdfs')
    os.makedirs(media_dir, exist_ok=True)

    filename = f'prescription_{prescription.id}.pdf'
    filepath = os.path.join(media_dir, filename)

    doc = SimpleDocTemplate(
        filepath,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()
    header_title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#1e40af'),
        fontName='Helvetica-Bold',
    )
    header_sub_style = ParagraphStyle(
        'HeaderSub',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#4b5563'),
    )
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e3a8a'),
        fontName='Helvetica-Bold',
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1f2937'),
    )
    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#111827'),
    )
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        fontName='Helvetica-Bold',
        textColor=colors.white,
    )

    story = []

    doctor = prescription.doctor
    doctor_profile = getattr(doctor, 'doctor_profile', None)
    patient = prescription.patient
    patient_profile = getattr(patient, 'patient_profile', None)

    clinic_name = doctor_profile.clinic_name if doctor_profile and doctor_profile.clinic_name else 'MEDFLOW HEALTHCARE'
    clinic_addr = doctor_profile.clinic_address if doctor_profile and doctor_profile.clinic_address else 'Authorized Non-Critical Care Network'

    header_data = [
        [
            Paragraph(f"<b>{clinic_name.upper()}</b>", header_title_style),
            Paragraph(
                f"<b>Dr. {doctor.get_full_name()}</b><br/>"
                f"{doctor_profile.specialty if doctor_profile else 'Physician'}<br/>"
                f"Lic #{doctor_profile.license_number if doctor_profile else 'MCI-REG'}<br/>"
                f"Phone: {doctor.phone or 'N/A'}",
                header_sub_style,
            )
        ],
        [
            Paragraph(f"{clinic_addr}", header_sub_style),
            Paragraph(f"Date: {timezone.localtime(prescription.finalized_at or timezone.now()).strftime('%d %b %Y, %I:%M %p')}", header_sub_style)
        ]
    ]

    header_table = Table(header_data, colWidths=[3.8 * inch, 3.4 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width='100%', thickness=1.5, color=colors.HexColor('#2563eb'), spaceBefore=4, spaceAfter=12))

    pat_gender = patient_profile.gender if patient_profile and patient_profile.gender else 'N/A'
    pat_blood = patient_profile.blood_group if patient_profile and patient_profile.blood_group else 'N/A'
    pat_dob = str(patient_profile.date_of_birth) if patient_profile and patient_profile.date_of_birth else 'N/A'

    patient_info_data = [
        [
            Paragraph(f"<b>Patient Name:</b> {patient.get_full_name()}", body_style),
            Paragraph(f"<b>Patient ID:</b> {str(patient.id)[:8].upper()}", body_style),
            Paragraph(f"<b>Gender / DOB:</b> {pat_gender} ({pat_dob})", body_style),
        ],
        [
            Paragraph(f"<b>Blood Group:</b> {pat_blood}", body_style),
            Paragraph(f"<b>Prescription No:</b> RX-{str(prescription.id)[:8].upper()}", body_style),
            Paragraph(f"<b>Status:</b> {prescription.status.upper()}", body_style),
        ]
    ]

    pat_table = Table(patient_info_data, colWidths=[2.6 * inch, 2.3 * inch, 2.3 * inch])
    pat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(pat_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Clinical Diagnosis & Observations", section_title_style))
    diag_text = f"<b>Primary Diagnosis:</b> {prescription.diagnosis or 'Clinical consultation assessment'}"
    if prescription.notes:
        diag_text += f"<br/><br/><b>Clinical Advice / Remarks:</b> {prescription.notes}"
    story.append(Paragraph(diag_text, body_style))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Prescribed Medications (Rx)", section_title_style))

    med_rows = [[
        Paragraph("<b>Medication</b>", table_header_style),
        Paragraph("<b>Dosage</b>", table_header_style),
        Paragraph("<b>Frequency</b>", table_header_style),
        Paragraph("<b>Duration</b>", table_header_style),
        Paragraph("<b>Instructions</b>", table_header_style),
        Paragraph("<b>Qty</b>", table_header_style),
    ]]

    for item in prescription.items.all():
        med_rows.append([
            Paragraph(item.medication_name, table_cell_style),
            Paragraph(item.dosage, table_cell_style),
            Paragraph(item.frequency, table_cell_style),
            Paragraph(item.duration, table_cell_style),
            Paragraph(item.instructions or '-', table_cell_style),
            Paragraph(str(item.quantity), table_cell_style),
        ])

    if len(med_rows) == 1:
        med_rows.append([
            Paragraph("No prescription items listed.", table_cell_style),
            Paragraph("-", table_cell_style),
            Paragraph("-", table_cell_style),
            Paragraph("-", table_cell_style),
            Paragraph("-", table_cell_style),
            Paragraph("-", table_cell_style),
        ])

    med_table = Table(med_rows, colWidths=[2.2 * inch, 1.0 * inch, 1.1 * inch, 1.0 * inch, 1.4 * inch, 0.5 * inch])
    med_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2563eb')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
    ]))
    story.append(med_table)
    story.append(Spacer(1, 20))

    if prescription.amendments.exists():
        story.append(Paragraph("Audit History & Amendments", section_title_style))
        for amend in prescription.amendments.all()[:3]:
            amend_text = f"• Amended by Dr. {amend.amended_by.get_full_name() if amend.amended_by else 'Staff'} on {amend.amended_at.strftime('%d %b %Y, %I:%M %p')}: <i>{amend.reason}</i>"
            story.append(Paragraph(amend_text, header_sub_style))
        story.append(Spacer(1, 14))

    hash_source = f"{prescription.id}:{doctor.id}:{patient.id}:{prescription.finalized_at}"
    auth_hash = hashlib.sha256(hash_source.encode('utf-8')).hexdigest()[:24].upper()

    footer_data = [
        [
            Paragraph(
                f"<b>MEDFLOW VERIFIED ELECTRONIC APPROVAL</b><br/>"
                f"Digital Verification Stamp: <code>{auth_hash}</code><br/>"
                f"Generated securely via Medflow Non-Critical Care Engine",
                header_sub_style,
            ),
            Paragraph(
                f"<b>Digitally Approved By:</b><br/>"
                f"Dr. {doctor.get_full_name()}<br/>"
                f"Lic #{doctor_profile.license_number if doctor_profile else 'VERIFIED'}",
                ParagraphStyle('Sig', parent=body_style, alignment=2),
            )
        ]
    ]

    footer_table = Table(footer_data, colWidths=[4.2 * inch, 3.0 * inch])
    footer_table.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, -1), 1, colors.HexColor('#93c5fd')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(footer_table)

    doc.build(story)
    relative_path = os.path.join('prescriptions', 'pdfs', filename).replace('\\', '/')
    prescription.pdf_file.name = relative_path
    prescription.save(update_fields=['pdf_file'])
    return relative_path

