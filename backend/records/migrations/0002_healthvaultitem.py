import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('records', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='HealthVaultItem',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('category', models.CharField(default='lab_report', max_length=50)),
                ('file_url', models.CharField(blank=True, max_length=500)),
                ('file_size', models.CharField(blank=True, default='1.2 MB', max_length=50)),
                ('is_encrypted', models.BooleanField(default=True)),
                ('shared_with_doctor_until', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(limit_choices_to={'role': 'patient'}, on_delete=django.db.models.deletion.CASCADE, related_name='health_vault_items', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'health_vault_items',
                'ordering': ['-created_at'],
            },
        ),
    ]
