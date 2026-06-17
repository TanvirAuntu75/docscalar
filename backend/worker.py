import os
from redis import Redis
from rq import Worker, Queue
from backend import config

listen = ['docforge_conversions']

if __name__ == '__main__':
    redis_conn = Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT
    )

    queues = [Queue(name, connection=redis_conn) for name in listen]
    worker = Worker(queues, connection=redis_conn)
    print("Starting RQ Worker for DocForge...")
    worker.work()
