from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "VentasYa"
    PROJECT_VERSION: str = "0.1.0"
    DATABASE_URL: str
    SECRET_KEY: str = "development-only-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    SQL_ECHO: bool = False
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    def model_post_init(self, __context) -> None:
        if self.ENVIRONMENT.lower() == "production" and self.SECRET_KEY == "development-only-change-me":
            raise ValueError("SECRET_KEY debe configurarse en producción")

settings = Settings()
