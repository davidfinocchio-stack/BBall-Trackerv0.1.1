import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.player import Player
from app.models.team import Team
from app.models.game import Game
from app.models.event import Event
from app.models.enums import EventType

def get_all_player_stats(db: Session) -> List[Dict[str, Any]]:
    players = db.query(Player).all()
    teams = db.query(Team).all()
    
    team_name_map = {t.id: t.name for t in teams}
    team_abbr_map = {t.id: t.abbreviation for t in teams}
    
    games = db.query(Game).filter(Game.status != "SCHEDULED").all()
    game_ids = [g.id for g in games]
    
    events = []
    if game_ids:
        events = db.query(Event).filter(Event.game_id.in_(game_ids)).all()
        
    player_stats_list = []
    
    # Compute dynamically from DB events
    player_map = {}
    for p in players:
        pid_str = str(p.id)
        player_map[pid_str] = {
            "player_id": pid_str,
            "name": p.name,
            "jersey_number": p.jersey_number,
            "position": p.position,
            "team_id": str(p.team_id) if p.team_id else None,
            "team_name": team_name_map.get(p.team_id, "Free Agent"),
            "team_abbreviation": team_abbr_map.get(p.team_id, "FA"),
            "games_played": 0,
            "PTS": 0, "AST": 0, "OREB": 0, "DREB": 0, "STL": 0, "BLK": 0, "PF": 0, "TOV": 0,
            "FGM": 0, "FGA": 0, "3PM": 0, "3PA": 0, "FTM": 0, "FTA": 0
        }
        
    # Count games played for each player based on their team participating in non-scheduled games
    for g in games:
        home_team_id_str = str(g.home_team_id)
        away_team_id_str = str(g.away_team_id)
        for p in players:
            pid_str = str(p.id)
            p_team_id_str = str(p.team_id) if p.team_id else None
            if p_team_id_str in (home_team_id_str, away_team_id_str):
                player_map[pid_str]["games_played"] += 1
                
    # Parse events
    for e in events:
        pid_str = str(e.primary_player_id) if e.primary_player_id else None
        if not pid_str or pid_str not in player_map:
            continue
            
        ev_type = e.event_type.value if hasattr(e.event_type, "value") else str(e.event_type)
        p_stats = player_map[pid_str]
        
        # Determine shot value
        is_three = False
        if e.shot_location and getattr(e.shot_location, "shot_value", None) == 3:
            is_three = True
        elif e.metadata_json and isinstance(e.metadata_json, dict):
            shot_type = e.metadata_json.get("shot_type") or e.metadata_json.get("shotType")
            if shot_type in ("Triple", "3PT", "3-Pointer", "3-point") or e.metadata_json.get("shot_value") == 3 or e.metadata_json.get("shotValue") == 3:
                is_three = True
                
        if ev_type == "SHOT_MADE":
            p_stats["FGM"] += 1
            p_stats["FGA"] += 1
            if is_three:
                p_stats["3PM"] += 1
                p_stats["3PA"] += 1
                p_stats["PTS"] += 3
            else:
                p_stats["PTS"] += 2
        elif ev_type == "SHOT_MISSED":
            p_stats["FGA"] += 1
            if is_three:
                p_stats["3PA"] += 1
        elif ev_type == "FREE_THROW_MADE":
            p_stats["FTM"] += 1
            p_stats["FTA"] += 1
            p_stats["PTS"] += 1
        elif ev_type == "FREE_THROW_MISSED":
            p_stats["FTA"] += 1
        elif ev_type == "OFFENSIVE_REBOUND":
            p_stats["OREB"] += 1
        elif ev_type == "DEFENSIVE_REBOUND":
            p_stats["DREB"] += 1
        elif ev_type == "ASSIST":
            p_stats["AST"] += 1
        elif ev_type == "STEAL":
            p_stats["STL"] += 1
        elif ev_type == "BLOCK":
            p_stats["BLK"] += 1
        elif ev_type in ("FOUL", "TECHNICAL_FOUL"):
            p_stats["PF"] += 1
            
    # Post-process per-game averages
    for pid_str, p_stats in player_map.items():
        # If player has registered events but games_played is 0, default to 1 GP
        gp = p_stats["games_played"]
        has_activity = (p_stats["PTS"] > 0 or p_stats["AST"] > 0 or p_stats["STL"] > 0 or p_stats["BLK"] > 0 or p_stats["FGA"] > 0)
        if gp == 0 and has_activity:
            gp = 1
            p_stats["games_played"] = 1
            
        rebound_total = p_stats["OREB"] + p_stats["DREB"]
        p_stats["REB"] = rebound_total
        
        p_stats["PPG"] = round(p_stats["PTS"] / gp, 1) if gp > 0 else 0.0
        p_stats["APG"] = round(p_stats["AST"] / gp, 1) if gp > 0 else 0.0
        p_stats["RPG"] = round(rebound_total / gp, 1) if gp > 0 else 0.0
        p_stats["SPG"] = round(p_stats["STL"] / gp, 1) if gp > 0 else 0.0
        p_stats["BPG"] = round(p_stats["BLK"] / gp, 1) if gp > 0 else 0.0
        p_stats["PFG"] = round(p_stats["PF"] / gp, 1) if gp > 0 else 0.0
        
        player_stats_list.append(p_stats)
        
    return player_stats_list

def get_league_leaders(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    all_stats = get_all_player_stats(db)
    
    categories = {
        "PPG": "PPG",
        "APG": "APG",
        "RPG": "RPG",
        "SPG": "SPG"
    }
    
    leaders = {}
    for cat_name, cat_key in categories.items():
        # Only include players who have played at least 1 game and have an average > 0.0
        active_players = [p for p in all_stats if p.get("games_played", 0) > 0 and p.get(cat_key, 0.0) > 0.0]
        # Sort descending by the category value
        sorted_players = sorted(
            active_players,
            key=lambda x: (x.get(cat_key, 0.0), x.get("PTS" if cat_key == "PPG" else cat_key.replace("G", ""), 0)),
            reverse=True
        )
        # Take Top 5
        leaders[cat_name] = [
            {
                "player_id": p["player_id"],
                "name": p["name"],
                "jersey_number": p["jersey_number"],
                "position": p["position"],
                "team_name": p["team_name"],
                "team_abbreviation": p["team_abbreviation"],
                "average": p[cat_key],
                "games_played": p["games_played"]
            }
            for p in sorted_players[:5]
        ]
        
    return leaders

def get_player_percentiles(db: Session, player_id: uuid.UUID) -> Dict[str, Any]:
    all_stats = get_all_player_stats(db)
    
    # Find the target player
    player_id_str = str(player_id)
    target_player = next((p for p in all_stats if p["player_id"] == player_id_str), None)
    
    if not target_player:
        # Fallback default profile if player isn't found
        return {
            "player_id": player_id_str,
            "metrics": [
                {"subject": "Scoring", "value": 50},
                {"subject": "Playmaking", "value": 50},
                {"subject": "Deflections/Steals", "value": 50},
                {"subject": "Rebounding", "value": 50},
                {"subject": "Discipline", "value": 50}
            ]
        }
        
    # Extract lists of values for all players in the league
    scorings = [p["PPG"] for p in all_stats]
    playmakings = [p["APG"] for p in all_stats]
    steals = [p["SPG"] for p in all_stats]
    reboundings = [p["RPG"] for p in all_stats]
    disciplines = [p["PFG"] for p in all_stats] # we will invert this (lower fouls = higher discipline)
    
    def calculate_percentile(values: List[float], target: float, higher_is_better: bool = True) -> int:
        if not values:
            return 50
            
        # If all values are 0, return a standard average of 50
        if all(v == 0.0 for v in values):
            return 50
            
        if higher_is_better:
            less_or_equal = sum(1 for v in values if v <= target)
        else:
            # lower is better (for fouls/discipline)
            less_or_equal = sum(1 for v in values if v >= target)
            
        percentile = (less_or_equal / len(values)) * 100
        # Clamping between 5 and 99 for nice visual presentation on radar chart, or full 0 to 100
        return int(max(0, min(100, percentile)))
        
    scoring_p = calculate_percentile(scorings, target_player["PPG"], higher_is_better=True)
    playmaking_p = calculate_percentile(playmakings, target_player["APG"], higher_is_better=True)
    steals_p = calculate_percentile(steals, target_player["SPG"], higher_is_better=True)
    rebounding_p = calculate_percentile(reboundings, target_player["RPG"], higher_is_better=True)
    # Discipline (low fouls) - higher discipline means fewer fouls per game
    discipline_p = calculate_percentile(disciplines, target_player["PFG"], higher_is_better=False)
    
    return {
        "player_id": player_id_str,
        "name": target_player["name"],
        "team_name": target_player["team_name"],
        "averages": {
            "PPG": target_player["PPG"],
            "APG": target_player["APG"],
            "RPG": target_player["RPG"],
            "SPG": target_player["SPG"],
            "PFG": target_player["PFG"]
        },
        "metrics": [
            {"subject": "Scoring", "value": scoring_p},
            {"subject": "Playmaking", "value": playmaking_p},
            {"subject": "Deflections/Steals", "value": steals_p},
            {"subject": "Rebounding", "value": rebounding_p},
            {"subject": "Discipline", "value": discipline_p}
        ]
    }
