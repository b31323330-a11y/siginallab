from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime

from ..db.session import get_session
from ..models.schemas import User, Notification
from .auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Bildirishnomalar"])

class SendNotificationRequest(BaseModel):
    user_id: Optional[int] = None
    target_group: Optional[str] = None  # "all", "210-22", "211-22"
    title: str
    message: str
    type: str = "announcement"  # announcement, deadline, grade, return, system
    link: Optional[str] = None

@router.get("")
def get_user_notifications(
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    uid = current_user.id if current_user else 1
    notifications = session.exec(
        select(Notification)
        .where(Notification.user_id == uid)
        .order_by(Notification.created_at.desc())
        .limit(30)
    ).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "link": n.link,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for n in notifications
    ]

@router.get("/unread_count")
def get_unread_count(
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    uid = current_user.id if current_user else 1
    unread = session.exec(
        select(Notification)
        .where(Notification.user_id == uid, Notification.is_read == False)
    ).all()
    return {"unread_count": len(unread)}

@router.post("/read/{notification_id}")
@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    session: Session = Depends(get_session)
):
    n = session.exec(select(Notification).where(Notification.id == notification_id)).first()
    if n:
        n.is_read = True
        session.add(n)
        session.commit()
    return {"status": "ok", "id": notification_id}

@router.post("/read_all")
@router.post("/mark_all_read")
def mark_all_read(
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    uid = current_user.id if current_user else 1
    notifs = session.exec(select(Notification).where(Notification.user_id == uid, Notification.is_read == False)).all()
    for n in notifs:
        n.is_read = True
        session.add(n)
    session.commit()
    return {"status": "ok", "marked": len(notifs)}

@router.post("/send")
def send_notification(
    req: SendNotificationRequest,
    current_user: Optional[User] = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    count = 0
    if req.user_id:
        n = Notification(
            user_id=req.user_id,
            title=req.title,
            message=req.message,
            type=req.type,
            link=req.link
        )
        session.add(n)
        count = 1
    elif req.target_group:
        query = select(User).where(User.role == "student")
        if req.target_group != "all":
            query = query.where(User.group_name == req.target_group)
        targets = session.exec(query).all()
        for u in targets:
            n = Notification(
                user_id=u.id,
                title=req.title,
                message=req.message,
                type=req.type,
                link=req.link
            )
            session.add(n)
            count += 1
    session.commit()
    return {"message": f"{count} ta foydalanuvchiga bildirishnoma yuborildi!", "sent_count": count}
