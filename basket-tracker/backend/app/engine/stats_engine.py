from typing import List, Any, Dict
import enum

def calculate_advanced_metrics(s: Dict[str, Any]) -> None:
    """
    Calculates advanced stats: eFG% and TS%.
    Ensures strict mathematical edge-case handling to avoid DivisionByZero.
    """
    fga = s.get("FGA", 0)
    fgm = s.get("FGM", 0)
    three_pm = s.get("3PM", 0)
    pts = s.get("PTS", 0)
    fta = s.get("FTA", 0)

    # eFG% = (FGM + 0.5 * 3PM) / FGA
    if fga > 0:
        s["eFG_pct"] = round((fgm + 0.5 * three_pm) / fga, 3)
    else:
        s["eFG_pct"] = 0.0

    # TS% = PTS / (2 * (FGA + 0.44 * FTA))
    ts_denom = 2 * (fga + 0.44 * fta)
    if ts_denom > 0:
        s["TS_pct"] = round(pts / ts_denom, 3)
    else:
        s["TS_pct"] = 0.0


def compute_game_boxscore(events: List[Any], home_team: Any = None, away_team: Any = None) -> Dict[str, Any]:
    """
    Aggregates statistics dynamically per Player and per Team.
    Loops through chronological sorted list of events for a single match.

    Args:
        events: List of GameEvent models or dicts representing events.
        home_team: Optional Team DB model or dict.
        away_team: Optional Team DB model or dict.

    Returns:
        Structured dictionary grouped by home_team and away_team statistics.
    """
    home_id_str = str(home_team.id) if home_team and hasattr(home_team, "id") else None
    away_id_str = str(away_team.id) if away_team and hasattr(away_team, "id") else None

    # Pre-populate structures
    boxscore = {
        "home_team": {
            "team_name": getattr(home_team, "name", "Home Team") if home_team else "Home Team",
            "team_abbreviation": getattr(home_team, "abbreviation", "HOME") if home_team else "HOME",
            "players": [],
            "totals": {
                "PTS": 0, "FGM": 0, "FGA": 0, "3PM": 0, "3PA": 0,
                "FTM": 0, "FTA": 0, "OREB": 0, "DREB": 0, "AST": 0,
                "TOV": 0, "STL": 0, "BLK": 0, "PF": 0, "eFG_pct": 0.0, "TS_pct": 0.0
            }
        },
        "away_team": {
            "team_name": getattr(away_team, "name", "Away Team") if away_team else "Away Team",
            "team_abbreviation": getattr(away_team, "abbreviation", "AWAY") if away_team else "AWAY",
            "players": [],
            "totals": {
                "PTS": 0, "FGM": 0, "FGA": 0, "3PM": 0, "3PA": 0,
                "FTM": 0, "FTA": 0, "OREB": 0, "DREB": 0, "AST": 0,
                "TOV": 0, "STL": 0, "BLK": 0, "PF": 0, "eFG_pct": 0.0, "TS_pct": 0.0
            }
        }
    }

    # Map player_id -> player_stats_dict
    players_map = {}
    player_to_team = {}

    # Initialize rosters
    if home_team and hasattr(home_team, "players") and home_team.players:
        for player in home_team.players:
            pid = str(player.id)
            player_to_team[pid] = "home_team"
            p_dict = {
                "player_id": pid,
                "name": player.name,
                "jersey_number": player.jersey_number,
                "position": player.position,
                "stats": {
                    "PTS": 0, "FGM": 0, "FGA": 0, "3PM": 0, "3PA": 0,
                    "FTM": 0, "FTA": 0, "OREB": 0, "DREB": 0, "AST": 0,
                    "TOV": 0, "STL": 0, "BLK": 0, "PF": 0, "eFG_pct": 0.0, "TS_pct": 0.0
                }
            }
            players_map[pid] = p_dict
            boxscore["home_team"]["players"].append(p_dict)

    if away_team and hasattr(away_team, "players") and away_team.players:
        for player in away_team.players:
            pid = str(player.id)
            player_to_team[pid] = "away_team"
            p_dict = {
                "player_id": pid,
                "name": player.name,
                "jersey_number": player.jersey_number,
                "position": player.position,
                "stats": {
                    "PTS": 0, "FGM": 0, "FGA": 0, "3PM": 0, "3PA": 0,
                    "FTM": 0, "FTA": 0, "OREB": 0, "DREB": 0, "AST": 0,
                    "TOV": 0, "STL": 0, "BLK": 0, "PF": 0, "eFG_pct": 0.0, "TS_pct": 0.0
                }
            }
            players_map[pid] = p_dict
            boxscore["away_team"]["players"].append(p_dict)

    # Process events
    for event in events:
        # Get event type string safely
        ev_type = None
        if hasattr(event, "event_type"):
            ev_type = event.event_type
            if hasattr(ev_type, "value"):
                ev_type = ev_type.value
        elif isinstance(event, dict):
            ev_type = event.get("event_type")
            if hasattr(ev_type, "value"):
                ev_type = ev_type.value

        if not ev_type:
            continue

        # Get player ID and team ID
        player_id = None
        if hasattr(event, "primary_player_id") and event.primary_player_id:
            player_id = str(event.primary_player_id)
        elif isinstance(event, dict) and event.get("primary_player_id"):
            player_id = str(event["primary_player_id"])

        event_team_id = None
        if hasattr(event, "team_id") and event.team_id:
            event_team_id = str(event.team_id)
        elif isinstance(event, dict) and event.get("team_id"):
            event_team_id = str(event["team_id"])

        # Determine team type
        team_type = None
        if home_id_str and event_team_id == home_id_str:
            team_type = "home_team"
        elif away_id_str and event_team_id == away_id_str:
            team_type = "away_team"
        elif player_id and player_id in player_to_team:
            team_type = player_to_team[player_id]
        else:
            team_type = "home_team"  # default fallback

        # Ensure player exists in maps if player_id is present
        if player_id and player_id not in players_map:
            p_name = "Unknown Player"
            p_jersey = None
            p_pos = None

            if hasattr(event, "primary_player") and event.primary_player:
                p_name = getattr(event.primary_player, "name", p_name)
                p_jersey = getattr(event.primary_player, "jersey_number", p_jersey)
                p_pos = getattr(event.primary_player, "position", p_pos)
            elif isinstance(event, dict) and event.get("primary_player"):
                p_name = event["primary_player"].get("name", p_name)
                p_jersey = event["primary_player"].get("jersey_number", p_jersey)
                p_pos = event["primary_player"].get("position", p_pos)

            p_dict = {
                "player_id": player_id,
                "name": p_name,
                "jersey_number": p_jersey,
                "position": p_pos,
                "stats": {
                    "PTS": 0, "FGM": 0, "FGA": 0, "3PM": 0, "3PA": 0,
                    "FTM": 0, "FTA": 0, "OREB": 0, "DREB": 0, "AST": 0,
                    "TOV": 0, "STL": 0, "BLK": 0, "PF": 0, "eFG_pct": 0.0, "TS_pct": 0.0
                }
            }
            players_map[player_id] = p_dict
            player_to_team[player_id] = team_type
            boxscore[team_type]["players"].append(p_dict)

        # Build list of stats dicts to increment
        stats_to_update = []
        if player_id and player_id in players_map:
            stats_to_update.append(players_map[player_id]["stats"])
        if team_type:
            stats_to_update.append(boxscore[team_type]["totals"])

        # Determine shot value
        is_three = False
        if hasattr(event, "shot_location") and event.shot_location:
            if getattr(event.shot_location, "shot_value", None) == 3:
                is_three = True
        elif isinstance(event, dict) and event.get("shot_location"):
            if event["shot_location"].get("shot_value") == 3:
                is_three = True

        # Fallback check on metadata
        metadata = getattr(event, "metadata_json", None) or (event.get("metadata_json") if isinstance(event, dict) else None)
        if not is_three and metadata and isinstance(metadata, dict):
            shot_type = metadata.get("shot_type") or metadata.get("shotType")
            if shot_type in ("Triple", "3PT", "3-Pointer", "3-point"):
                is_three = True
            elif metadata.get("shot_value") == 3 or metadata.get("shotValue") == 3:
                is_three = True

        # Apply stat updates based on EventType
        if ev_type == "SHOT_MADE":
            for s in stats_to_update:
                s["FGM"] += 1
                s["FGA"] += 1
                if is_three:
                    s["3PM"] += 1
                    s["3PA"] += 1
                    s["PTS"] += 3
                else:
                    s["PTS"] += 2
        elif ev_type == "SHOT_MISSED":
            for s in stats_to_update:
                s["FGA"] += 1
                if is_three:
                    s["3PA"] += 1
        elif ev_type == "FREE_THROW_MADE":
            for s in stats_to_update:
                s["FTM"] += 1
                s["FTA"] += 1
                s["PTS"] += 1
        elif ev_type == "FREE_THROW_MISSED":
            for s in stats_to_update:
                s["FTA"] += 1
        elif ev_type == "OFFENSIVE_REBOUND":
            for s in stats_to_update:
                s["OREB"] += 1
        elif ev_type == "DEFENSIVE_REBOUND":
            for s in stats_to_update:
                s["DREB"] += 1
        elif ev_type == "ASSIST":
            for s in stats_to_update:
                s["AST"] += 1
        elif ev_type in ("TURNOVER", "SHOT_CLOCK_VIOLATION"):
            for s in stats_to_update:
                s["TOV"] += 1
        elif ev_type == "STEAL":
            for s in stats_to_update:
                s["STL"] += 1
        elif ev_type == "BLOCK":
            for s in stats_to_update:
                s["BLK"] += 1
        elif ev_type in ("FOUL", "TECHNICAL_FOUL"):
            for s in stats_to_update:
                s["PF"] += 1

    # Post-process: Calculate advanced metrics for all players and team totals
    for team_type in ["home_team", "away_team"]:
        # Sort players by jersey number for neat presentation
        boxscore[team_type]["players"].sort(key=lambda x: x.get("jersey_number") or 999)
        for p in boxscore[team_type]["players"]:
            calculate_advanced_metrics(p["stats"])
        calculate_advanced_metrics(boxscore[team_type]["totals"])

    return boxscore
