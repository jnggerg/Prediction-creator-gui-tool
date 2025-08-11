from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field, field_validator, ConfigDict
from sqlalchemy import create_engine, Column, Integer, String, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from contextlib import contextmanager
from typing import List, Optional

app = FastAPI()

# sqlite db start
Base = declarative_base()
engine = create_engine("sqlite:///predictions.db") #create / start local sqlite db
SessionLocal = sessionmaker(bind=engine)

@contextmanager
def get_db():  #context manager for db session, no need to manually close, rollbacking handled
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

class PredictionTemplate(Base):
    __tablename__ = "prediction_templates"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    options = Column(JSON, nullable=False) #storing all options in a single JSON col for easier management
    duration = Column(Integer, default=90)

Base.metadata.create_all(bind=engine)

#serverside input validation
class TemplateCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=45)
    options : List[str] = Field(..., min_items=2, max_items=10)  #allowing up to 10 options
    duration: int = Field(90, ge=30, le=1800)  # Default 90 seconds, min 30, max 1800 sec

    @field_validator("title")
    @classmethod
    def validate_strings(cls, v : str) -> str:
        if v is not None and not v.strip():
            raise ValueError("Field cannot be empty / only whitespace")
        return v.strip() if v else v
    
    @field_validator("options")
    @classmethod
    def validate_options(cls, v: List[str])-> List[str]:
        cleaned_options = []
        for option in v:
            if not option.strip(): #no need to check option itself, .strip wont ever crash since were indexing List[str] only and it wont ever be None, just ""
                raise ValueError("Field cannot be empty / only whitespace")
            if len(option.strip()) > 25:
                raise ValueError("Option length cannot exceed 25 characters") #twitch allows max 25 length
            cleaned_options.append(option.strip()) 
        return cleaned_options


class TemplateResponse(BaseModel):#for sqlalchemy compatibility
    model_config = ConfigDict(from_attributes=True)  
    id: int
    title: str
    options: List[str]
    duration: int

@app.get("/templates", response_model=List[TemplateResponse])
def get_templates():
    try:
        with get_db() as db:
            templates = db.query(PredictionTemplate).all()
            return [TemplateResponse.model_validate(t) for t in templates]
    except HTTPException: 
        raise #re-raise HTTP error
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/templates/{template_id}", response_model=TemplateResponse)
def get_template(template_id: int):
    try:
        with get_db() as db:
            template = db.query(PredictionTemplate).filter(PredictionTemplate.id == template_id).first()
            if not template:
                raise HTTPException(status_code=404, detail="Template not found")
            return TemplateResponse.model_validate(template)
    except HTTPException: 
        raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/templates", response_model=TemplateResponse)
def add_template(template: TemplateCreate):
    try:
        with get_db() as db:
            new_template = PredictionTemplate(**template.model_dump())
            db.add(new_template)
            db.flush()  #ensure id is generated
            db.refresh(new_template)
            return TemplateResponse.model_validate(new_template)
    except HTTPException: 
        raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/templates/{template_id}", response_model=TemplateResponse)
def update_template(template_id: int, template: TemplateCreate):
    try:
        with get_db() as db:
            existing_template = db.query(PredictionTemplate).filter(PredictionTemplate.id == template_id).first() #find by id
            if not existing_template:
                raise HTTPException(status_code=404, detail="Template not found")
            
            for key, value in template.model_dump().items():
                setattr(existing_template, key, value)
            
            db.refresh(existing_template)
            return TemplateResponse.model_validate(existing_template)
    except HTTPException: 
        raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/templates/{template_id}")
def delete_template(template_id: int):
    try:
        with get_db() as db:
            template = db.query(PredictionTemplate).filter(PredictionTemplate.id == template_id).first()
            if not template:
                raise HTTPException(status_code=404, detail="Template not found")
            db.delete(template)
            return {"message": "Template deleted successfully"}
    except HTTPException: 
        raise 
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))