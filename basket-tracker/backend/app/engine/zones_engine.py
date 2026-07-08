import math

def get_court_zone(x: float, y: float) -> dict:
    """
    Translates normalized half-court coordinates (100x100 grid) into court zones and shot values.
    
    The coordinate system assumes:
    - x in [0.0, 100.0]: left sideline is at 0, right sideline is at 100.
    - y in [0.0, 100.0]: baseline is at 0, half-court line is at 100.
    - Hoop center is perfectly positioned at (50.0, 5.25).

    Mathematical boundaries:
    - 3-point line:
      * Straight side lines: 3 feet (6.0 units in 100-width grid) from sidelines,
        extending from the baseline (y=0) up to y=28.0 (14 feet).
      * Arc radius: 23.75 feet (47.5 units) from the hoop center (50.0, 5.25).
    - Paint / Key:
      * Width: 16 feet (32.0 units), spanning from x=34.0 to x=66.0.
      * Length: 19 feet (38.0 units), spanning from baseline (y=0) to y=38.0.
    - Restricted Area:
      * Semi-circle radius of 4 feet (8.0 units) centered at the hoop (50.0, 5.25),
        defined for y >= 5.25.
    
    Returns:
        dict: A dictionary containing "zone" (str) and "shot_value" (int).
    
    Raises:
        ValueError: If x or y coordinates are outside the [0, 100] grid.
    """
    if not (0.0 <= x <= 100.0) or not (0.0 <= y <= 100.0):
        raise ValueError(f"Coordinates ({x}, {y}) must be within the [0.0, 100.0] grid boundaries.")

    # Calculate squared distance to hoop center (50.0, 5.25) to avoid square root when possible
    hoop_x, hoop_y = 50.0, 5.25
    dx = x - hoop_x
    dy = y - hoop_y
    dist_sq = dx * dx + dy * dy

    # 1. Check Corner Threes (y <= 28.0, and within 6.0 units of either sideline)
    if y <= 28.0:
        if x <= 6.0:
            return {"zone": "LEFT_CORNER_THREE", "shot_value": 3}
        elif x >= 94.0:
            return {"zone": "RIGHT_CORNER_THREE", "shot_value": 3}

    # 2. Check Above the Break Three
    # The 3-point line radius is 47.5 units
    three_point_radius_sq = 47.5 * 47.5
    if dist_sq >= three_point_radius_sq:
        return {"zone": "ABOVE_THE_BREAK_THREE", "shot_value": 3}

    # 3. Check Restricted Area
    # Semi-circle of radius 8.0 units centered at hoop, with y >= 5.25
    restricted_radius_sq = 8.0 * 8.0
    if dist_sq <= restricted_radius_sq and y >= hoop_y:
        return {"zone": "RESTRICTED_AREA", "shot_value": 2}

    # 4. Check Paint
    # Standard NBA key rectangle is 16ft (32.0 units) wide, and 19ft (38.0 units) deep
    if 34.0 <= x <= 66.0 and 0.0 <= y <= 38.0:
        return {"zone": "PAINT", "shot_value": 2}

    # 5. Otherwise, Mid-Range
    return {"zone": "MID_RANGE", "shot_value": 2}
