# main.py
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
import os

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./expenses.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Expense(Base):
    __tablename__ = "expenses"
    
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic Models
class ExpenseBase(BaseModel):
    amount: float = Field(..., gt=0, description="Amount must be greater than 0")
    description: str = Field(..., min_length=1, max_length=200, description="Description is required")
    category: str = Field(..., description="Category is required")

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExpenseUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    category: Optional[str] = None

class TotalResponse(BaseModel):
    total: float
    count: int
    category: Optional[str] = None

class CategoryStats(BaseModel):
    category: str
    total: float
    count: int
    percentage: float

class StatsResponse(BaseModel):
    total_amount: float
    total_expenses: int
    categories: List[CategoryStats]

# FastAPI app
app = FastAPI(
    title="Expense Tracker API",
    description="A comprehensive API for tracking personal expenses",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Available categories
CATEGORIES = [
    "Food", "Transportation", "Entertainment", "Shopping", 
    "Bills", "Health", "Other"
]

# API Endpoints

@app.get("/")
async def root():
    return {"message": "Expense Tracker API", "version": "1.0.0"}

@app.get("/categories")
async def get_categories():
    """Get all available expense categories"""
    return {"categories": CATEGORIES}

@app.post("/expenses", response_model=ExpenseResponse)
async def create_expense(expense: ExpenseCreate, db: Session = Depends(get_db)):
    """Create a new expense"""
    if expense.category not in CATEGORIES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {', '.join(CATEGORIES)}"
        )
    
    db_expense = Expense(
        amount=expense.amount,
        description=expense.description.strip(),
        category=expense.category
    )
    
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    
    return db_expense

@app.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of expenses to return"),
    offset: int = Query(0, ge=0, description="Number of expenses to skip"),
    sort_by: str = Query("date", description="Sort by: date, amount, category"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    db: Session = Depends(get_db)
):
    """Get all expenses with optional filtering and pagination"""
    query = db.query(Expense)
    
    # Apply category filter
    if category and category.lower() != "all":
        if category not in CATEGORIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid category. Must be one of: {', '.join(CATEGORIES)}"
            )
        query = query.filter(Expense.category == category)
    
    # Apply sorting
    sort_column = getattr(Expense, sort_by, Expense.date)
    if sort_order.lower() == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    # Apply pagination
    expenses = query.offset(offset).limit(limit).all()
    
    return expenses

@app.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(expense_id: int, db: Session = Depends(get_db)):
    """Get a specific expense by ID"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@app.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int, 
    expense_update: ExpenseUpdate, 
    db: Session = Depends(get_db)
):
    """Update a specific expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    # Update fields if provided
    if expense_update.amount is not None:
        expense.amount = expense_update.amount
    if expense_update.description is not None:
        expense.description = expense_update.description.strip()
    if expense_update.category is not None:
        if expense_update.category not in CATEGORIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid category. Must be one of: {', '.join(CATEGORIES)}"
            )
        expense.category = expense_update.category
    
    db.commit()
    db.refresh(expense)
    
    return expense

@app.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    """Delete a specific expense"""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(expense)
    db.commit()
    
    return {"message": "Expense deleted successfully"}

@app.get("/expenses/total", response_model=TotalResponse)
async def get_total(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """Get total amount and count of expenses"""
    query = db.query(func.sum(Expense.amount), func.count(Expense.id))
    
    if category and category.lower() != "all":
        if category not in CATEGORIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid category. Must be one of: {', '.join(CATEGORIES)}"
            )
        query = query.filter(Expense.category == category)
    
    result = query.first()
    total = result[0] if result[0] else 0.0
    count = result[1] if result[1] else 0
    
    return TotalResponse(total=total, count=count, category=category)

@app.get("/expenses/stats", response_model=StatsResponse)
async def get_stats(db: Session = Depends(get_db)):
    """Get comprehensive expense statistics by category"""
    # Get total amount and count
    total_result = db.query(func.sum(Expense.amount), func.count(Expense.id)).first()
    total_amount = total_result[0] if total_result[0] else 0.0
    total_expenses = total_result[1] if total_result[1] else 0
    
    # Get category breakdown
    category_stats = []
    category_results = db.query(
        Expense.category,
        func.sum(Expense.amount),
        func.count(Expense.id)
    ).group_by(Expense.category).all()
    
    for category, amount, count in category_results:
        percentage = (amount / total_amount * 100) if total_amount > 0 else 0
        category_stats.append(CategoryStats(
            category=category,
            total=amount,
            count=count,
            percentage=round(percentage, 2)
        ))
    
    # Sort by total amount (descending)
    category_stats.sort(key=lambda x: x.total, reverse=True)
    
    return StatsResponse(
        total_amount=total_amount,
        total_expenses=total_expenses,
        categories=category_stats
    )

@app.delete("/expenses")
async def delete_all_expenses(
    category: Optional[str] = Query(None, description="Delete only expenses from this category"),
    confirm: bool = Query(False, description="Confirmation required"),
    db: Session = Depends(get_db)
):
    """Delete all expenses (with optional category filter)"""
    if not confirm:
        raise HTTPException(
            status_code=400, 
            detail="Confirmation required. Add ?confirm=true to the request"
        )
    
    query = db.query(Expense)
    
    if category and category.lower() != "all":
        if category not in CATEGORIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid category. Must be one of: {', '.join(CATEGORIES)}"
            )
        query = query.filter(Expense.category == category)
        message = f"All {category} expenses deleted successfully"
    else:
        message = "All expenses deleted successfully"
    
    deleted_count = query.count()
    query.delete()
    db.commit()
    
    return {"message": message, "deleted_count": deleted_count}

# Error handlers
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return HTTPException(status_code=400, detail=str(exc))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# requirements.txt content (create this as a separate file)
"""
fastapi==0.104.1
uvicorn==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
"""

# database.py - Alternative database configuration file
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database URL from environment variable or default to SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./expenses.db")

# For PostgreSQL in production, use:
# DATABASE_URL = "postgresql://user:password@localhost/expense_tracker"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_database():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""

# config.py - Configuration management
"""
from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./expenses.db"
    secret_key: str = "your-secret-key-here"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    class Config:
        env_file = ".env"

settings = Settings()
"""