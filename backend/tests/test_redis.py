import os

# Install redis
os.system("sudo apt-get update && sudo apt-get install -y redis-server")
os.system("sudo service redis-server start")

# Install requirements
os.system("pip install -r backend/requirements.txt")
