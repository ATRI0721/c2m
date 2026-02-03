from fastapi import APIRouter

from app.apis import agent, conversation, user, auth, chat, mcp


routers = APIRouter()

routers.include_router(user.router)
routers.include_router(auth.router)
routers.include_router(chat.router)
routers.include_router(conversation.router)
routers.include_router(mcp.router)
routers.include_router(agent.router)
