from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

app = FastAPI()

# sqlite db start
Base = declarative_base()
engine = create_engine("sqlite:///predictions.db") #create / start local sqlite db
SessionLocal = sessionmaker(bind=engine)

class PredictionTemplate(Base):
    __tablename__ = "prediction_templates"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=True)  
    option_c: str = None                        # temp 3rd option, will need more possibly(?)
    duration = Column(Integer, default=90)

Base.metadata.create_all(bind=engine)

#validation 
class TemplateCreate(BaseModel):
    title: str
    option_a: str
    option_b: str
    option_c: str = None  # Optional third option
    duration: int = 90

#used for output formatting since sqlalchemy uses python object, order is not preserved
class TemplateResponse(BaseModel):
    id: int
    title: str
    option_a: str
    option_b: str
    option_c: str = None  
    duration: int = 90
    class Config: #for alchemy parsing
        orm_mode = True

@app.get("/templates")
def get_templates():
    db = SessionLocal()
    templates = db.query(PredictionTemplate).all()
    db.close()
    return templates

@app.get("/templates/{template_id}")
def get_template(template_id: int):
    db = SessionLocal()
    template = db.query(PredictionTemplate).filter(PredictionTemplate.id == template_id).first()
    db.close()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@app.post("/templates")
def add_template(template: TemplateCreate):
    db = SessionLocal()
    new_template = PredictionTemplate(template.model_dump())
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    db.close()
    return new_template

@app.put("/templates/{template_id}")
def update_template(template_id: int, template: TemplateCreate):
    db = SessionLocal()
    existing_template = db.query(PredictionTemplate).filter(PredictionTemplate.id == template_id).first() #find by id
    if not existing_template:
        db.close()
        raise HTTPException(status_code=404, detail="Template not found")
    
    for key, value in template.model_dump().items():
        setattr(existing_template, key, value)
    
    db.commit()
    db.refresh(existing_template)
    db.close()
    return existing_template

@app.delete("/templates/{template_id}")
def delete_template(template_id: int):
    db = SessionLocal()
    template = db.query(PredictionTemplate).filter(PredictionTemplate.id == template_id).first()
    if not template:
        db.close()
        raise HTTPException(status_code=404, detail="Template not found")
    
    db.delete(template)
    db.commit()
    db.close()
    return {"message": "Template deleted successfully"}