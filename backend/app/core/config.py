import os

class Settings:
    PROJECT_NAME: str = "SignalLab UZ"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "signallab-uz-super-secret-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    DATA_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "content")
    SAMPLES_DIR: str = os.path.join(DATA_DIR, "samples")
    LABS_DIR: str = os.path.join(DATA_DIR, "labs")
    QUESTIONS_DIR: str = os.path.join(DATA_DIR, "questions")
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'signallab.db')}")
    
settings = Settings()
