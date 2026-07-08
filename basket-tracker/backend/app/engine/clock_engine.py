import re

# Match formats like MM:SS or MM:SS.f (e.g. "10:00", "00:04", "00:04.2")
TIMESTAMP_REGEX = re.compile(r"^\d{1,2}:[0-5]\d(\.\d+)?$")

def is_valid_timestamp(timestamp: str) -> bool:
    """
    Validates standard basketball game clock formats.
    Permitted formats:
    - MM:SS (e.g., "10:00", "00:00", "5:30")
    - MM:SS.f (e.g., "00:04.2")
    
    The seconds part must be in range [00, 59].
    """
    if not isinstance(timestamp, str):
        return False
    return bool(TIMESTAMP_REGEX.match(timestamp.strip()))

def timestamp_to_seconds(timestamp: str) -> float:
    """
    Helper function to convert a valid timestamp string into total seconds.
    """
    if not is_valid_timestamp(timestamp):
        raise ValueError(f"Invalid timestamp format: '{timestamp}'")
    
    parts = timestamp.strip().split(":")
    minutes = int(parts[0])
    seconds = float(parts[1])
    return minutes * 60.0 + seconds

def calculate_time_played(start_time: str, end_time: str) -> int:
    """
    Calculates the absolute difference in seconds between two game-clock timestamps
    within the same period (e.g., to track player minutes).
    
    Returns the absolute difference rounded to the nearest integer.
    """
    t1 = timestamp_to_seconds(start_time)
    t2 = timestamp_to_seconds(end_time)
    return int(round(abs(t1 - t2)))
