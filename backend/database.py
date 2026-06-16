import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Boolean, ForeignKey, event
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

Base = declarative_base()

# Use DATABASE_URL from env if available (e.g. Railway/Supabase), fallback to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./docforge.db")

# SQLite needs separate check for threading in multi-threaded environments
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    tier = Column(String(20), default="free")  # "free", "registered", "pro"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    jobs = relationship("JobHistory", back_populates="user")
    subscription = relationship("Subscription", uselist=False, back_populates="user")

class JobHistory(Base):
    __tablename__ = "jobs"
    
    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # Nullable for guest users
    tool_name = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)  # "queued", "finished", "failed"
    ip_address = Column(String(50), nullable=True)  # For guest rate limit checking
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="jobs")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    user_id = Column(String(36), ForeignKey("users.id"), primary_key=True)
    stripe_customer_id = Column(String(255), unique=True, nullable=False)
    status = Column(String(50), nullable=False)  # "active", "canceled", "incomplete"
    expires_at = Column(DateTime, nullable=True)
    
    user = relationship("User", back_populates="subscription")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
