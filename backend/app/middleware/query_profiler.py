import logging
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def setup_query_profiling():
    """Enable query profiling in development mode only"""
    import os
    if os.getenv("ENVIRONMENT") != "production":
        @event.listens_for(Engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            conn.info.setdefault('query_start_time', []).append(time.time())
            logger.debug(f"Starting query execution")

        @event.listens_for(Engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            total = time.time() - conn.info['query_start_time'].pop(-1)
            if total > 0.1:  # Log queries slower than 100ms
                logger.warning(f"SLOW QUERY ({total:.2f}s): {statement[:200]}")
            else:
                logger.debug(f"Query completed in {total:.4f}s")
