import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0002_appointment_consultation_fee_appointment_payment_id_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='doctor_commission',
            field=models.DecimalField(decimal_places=2, default=50.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='family_member_details',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='appointment',
            name='follow_up_discount_days',
            field=models.PositiveIntegerField(default=4),
        ),
        migrations.AddField(
            model_name='appointment',
            name='is_family_member',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appointment',
            name='is_follow_up',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appointment',
            name='is_sos',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='appointment',
            name='platform_fee',
            field=models.DecimalField(decimal_places=2, default=15.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='refund_amount',
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='refund_status',
            field=models.CharField(default='none', max_length=30),
        ),
        migrations.AlterField(
            model_name='appointment',
            name='consultation_fee',
            field=models.DecimalField(decimal_places=2, default=500.0, max_digits=10),
        ),
        migrations.CreateModel(
            name='MutualRating',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('patient_star_rating', models.PositiveIntegerField(default=5)),
                ('patient_consultation_quality', models.PositiveIntegerField(default=5)),
                ('patient_wait_time_score', models.PositiveIntegerField(default=5)),
                ('patient_feedback', models.TextField(blank=True)),
                ('doctor_cooperation_score', models.PositiveIntegerField(default=5)),
                ('doctor_punctuality_score', models.PositiveIntegerField(default=5)),
                ('doctor_record_completeness', models.PositiveIntegerField(default=5)),
                ('doctor_internal_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('appointment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='mutual_rating', to='appointments.appointment')),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_doctor_ratings', to=settings.AUTH_USER_MODEL)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='given_doctor_ratings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'mutual_ratings',
                'ordering': ['-created_at'],
            },
        ),
    ]
