"""Feedback training queue and trigger utilities.

Maintains an in-memory queue of user feedback items and exposes a
`trigger_training` function to process them.
"""

from __future__ import annotations

from collections import deque
from typing import Deque

from ..schemas import FeedbackItem

# In-memory queue for feedback items
_FEEDBACK_QUEUE: Deque[FeedbackItem] = deque()


def queue_feedback(item: FeedbackItem) -> None:
    """Enqueue a feedback item for later training."""
    _FEEDBACK_QUEUE.append(item)


def trigger_training() -> int:
    """Process queued feedback items and return count processed.

    This is a stub standing in for an actual transformer fine-tuning
    routine. It simply drains the queue and returns the number of items
    handled.
    """
    count = 0
    while _FEEDBACK_QUEUE:
        _FEEDBACK_QUEUE.popleft()
        count += 1
    return count
