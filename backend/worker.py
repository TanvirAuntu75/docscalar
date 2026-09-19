from redis import Redis
from rq import Queue, Worker

from backend import config

listen = ["docscalar_conversions", "docforge_conversions"]


def run_worker():
    redis_conn = Redis(host=config.REDIS_HOST, port=config.REDIS_PORT)
    queues = [Queue(name, connection=redis_conn) for name in listen]
    worker = Worker(queues, connection=redis_conn)
    print("Starting RQ Worker for DocScalar...")
    worker.work()


if __name__ == "__main__":
    run_worker()
