from typing import List, Optional

from pydantic import BaseModel


class AIImage(BaseModel):
    id: int
    fileName: str
    contentType: str = "application/octet-stream"
    imageOrder: Optional[int] = None
    seriesId: Optional[int] = None
    dataBase64: str


class AIRequest(BaseModel):
    studyId: str
    databaseStudyId: Optional[int] = None
    patientId: Optional[int] = None
    modality: str = "UNKNOWN"
    modelType: str = "GENERAL"
    bodyPart: Optional[str] = None
    studyDescription: Optional[str] = None
    images: List[AIImage] = []