import subprocess
import time

worker = subprocess.Popen(["rq", "worker", "docforge_conversions", "--url", "redis://localhost:6379"])
time.sleep(5)
worker.terminate()
