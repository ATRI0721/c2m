from typing import List, TypeVar, Generic
from sqlmodel import Session, select, func

T = TypeVar('T')


def paginate_query(
    session: Session,
    query,
    page: int = 1,
    page_size: int = 20
) -> tuple[List[T], int]:
    """
    Paginate a query and return items and total count

    Args:
        session: Database session
        query: Base query to paginate
        page: Page number (1-indexed)
        page_size: Number of items per page

    Returns:
        Tuple of (items, total_count)
    """
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply pagination
    offset = (page - 1) * page_size
    paginated_query = query.offset(offset).limit(page_size)
    items = list(session.exec(paginated_query).all())

    return items, total


def calculate_total_pages(total: int, page_size: int) -> int:
    """Calculate total number of pages"""
    return (total + page_size - 1) // page_size if page_size > 0 else 0
