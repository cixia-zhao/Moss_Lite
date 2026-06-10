from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from ..db import get_db
from ..models import FinancialRecord
from ..services.bill_parser import parse_billing_csv
from .records import recalculate_daily_rating

router = APIRouter()

@router.post("/bills/upload")
async def upload_bill_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    接受上传的微信或支付宝 CSV 账单，解析后入库。
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="仅支持上传 CSV 格式的账单文件")
        
    try:
        file_bytes = await file.read()
        records = parse_billing_csv(file_bytes, file.filename)
        
        if not records:
            return {"detail": "未在此文件中解析出有效的收支账单流水。"}
            
        # 跟踪导入了哪些日期，以便之后统一更新评级
        imported_dates = set()
        db_records = []
        
        for r in records:
            db_record = FinancialRecord(
                type=r["type"],
                amount=r["amount"],
                category=r["category"],
                source=r["source"],
                description=r["description"],
                date=r["date"]
            )
            db.add(db_record)
            db_records.append(db_record)
            imported_dates.add(r["date"])
            
        db.commit()
        
        # 批量重新计算这几天的自律等级
        for target_date in imported_dates:
            recalculate_daily_rating(db, target_date)
            
        return {
            "detail": f"成功导入 {len(db_records)} 条账单流水",
            "imported_count": len(db_records),
            "imported_dates": list(imported_dates)
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"账单处理失败: {str(e)}")
