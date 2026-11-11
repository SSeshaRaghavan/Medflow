import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctorprofile',
            name='is_vacation_mode',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='doctorprofile',
            name='weekly_availability',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.CreateModel(
            name='OTPVerification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('contact_target', models.CharField(max_length=200)),
                ('otp_type', models.CharField(default='signup', max_length=20)),
                ('mobile_code', models.CharField(max_length=6)),
                ('email_code', models.CharField(max_length=6)),
                ('is_verified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='otp_codes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'otp_verifications',
                'ordering': ['-created_at'],
            },
        ),
    ]
