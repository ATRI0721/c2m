from typing import Generator
import logging
from app.core.security import get_password_hash
from sqlmodel import SQLModel, Session, create_engine, select
from sqlalchemy import event
from sqlalchemy.orm import mapper, RelationshipProperty
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.models.database import *  # 确保所有模型都被导入

logger = logging.getLogger(__name__)

# Optimized database engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # For SQLite, use StaticPool for better performance
    pool_pre_ping=True,  # Verify connections before using
    echo=False,  # Set to True for SQL query logging in development
    pool_recycle=3600,  # Recycle connections after 1 hour
)

# 全局设置所有关系的默认加载策略
@event.listens_for(mapper, "mapper_configured")
def _set_default_lazy_loading(mapper_, class_):
    """为所有关系设置默认的加载策略"""
    # 只处理SQLModel表模型
    if hasattr(class_, '__tablename__') and hasattr(class_, '__table__'):
        for prop in mapper_.iterate_properties:
            # 只处理关系属性
            if isinstance(prop, RelationshipProperty):
                # 只在未明确设置lazy策略时修改
                if prop.lazy in ('select', True):  # SQLModel默认是'select'
                    # 根据关系类型设置不同的默认策略
                    if prop.uselist:  # 一对多关系
                        prop.lazy = 'selectin'
                    else:  # 多对一或一对一关系
                        prop.lazy = 'joined'

def create_db_and_tables():
    """创建数据库表"""
    SQLModel.metadata.create_all(engine, checkfirst=True)

def init_default_admin_user():
    """初始化默认管理员用户"""
    session = Session(engine)
    try:
        # 检查是否已有用户
        existing_users = session.exec(select(User)).all()
        if existing_users:
            logger.info(f"数据库已有 {len(existing_users)} 个用户，跳过默认管理员创建")
            return

        # 为每个管理员邮箱创建默认用户
        for admin_email in settings.ADMIN_EMAILS:
            # 检查用户是否已存在
            existing_user = session.exec(select(User).where(User.email == admin_email)).first()
            if existing_user:
                logger.info(f"管理员用户 {admin_email} 已存在")
                continue

            # 创建默认管理员用户
            default_password = "admin123"  # 默认密码，建议首次登录后修改
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash(default_password),
                is_active=True
            )
            session.add(admin_user)
            session.commit()
            logger.info(f"✅ 创建默认管理员用户: {admin_email} (默认密码: {default_password})")
            logger.warning(f"⚠️  安全提示: 请在生产环境中修改默认密码！")

    except Exception as e:
        logger.error(f"创建默认管理员用户失败: {e}")
        session.rollback()
    finally:
        session.close()

def get_session() -> Generator[Session, None, None]:
    """获取数据库会话（依赖注入用）"""
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

def create_db_session() -> Session:
    """创建新的数据库会话实例"""
    return Session(engine)

# 初始化数据库
create_db_and_tables()
init_default_admin_user()
