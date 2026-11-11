import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('appointments', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='consultation_fee',
            field=models.DecimalField(decimal_places=2, default=50.0, max_digits=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='payment_id',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='appointment',
            name='payment_status',
            field=models.CharField(default='paid', max_length=20),
        ),
        migrations.AddField(
            model_name='appointment',
            name='time_slot',
            field=models.CharField(blank=True, default='10:00 AM', max_length=50),
        ),
        migrations.CreateModel(
            name='ConsultationMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('message', models.TextField()),
                ('is_encrypted', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('appointment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='chat_messages', to='appointments.appointment')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_consultation_messages', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'consultation_messages',
                'ordering': ['created_at'],
            },
        ),
    ]
