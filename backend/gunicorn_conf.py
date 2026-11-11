import multiprocessing

bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 60
keepalive = 2
accesslog = "/var/log/medflow/gunicorn_access.log"
errorlog = "/var/log/medflow/gunicorn_error.log"
loglevel = "info"
proc_name = "medflow_gunicorn"
daemon = False

