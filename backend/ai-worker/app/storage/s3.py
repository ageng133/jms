import boto3
from botocore.client import Config
from app.config import settings


class S3Client:
    def __init__(self):
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
            use_ssl=settings.S3_USE_SSL,
            config=Config(signature_version="s3v4"),
        )
        self.bucket = settings.S3_BUCKET_NAME

    def download_file_bytes(self, s3_key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=s3_key)
        return response["Body"].read()

    def upload_file_bytes(self, s3_key: str, data: bytes, content_type: str = "application/pdf") -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=data,
            ContentType=content_type,
        )
        return s3_key

