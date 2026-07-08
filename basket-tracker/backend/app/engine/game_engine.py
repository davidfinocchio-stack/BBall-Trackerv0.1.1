from typing import List, Dict, Any, Union, Optional
from uuid import UUID
from app.engine.event_engine import DomainValidationError

def _normalize_id(player_id: Any) -> str:
    """Helper to convert any ID (int, UUID, str) to a clean string representation."""
    if player_id is None:
        return ""
    if isinstance(player_id, UUID):
        return str(player_id)
    return str(player_id).strip()

def process_substitution(
    current_lineup: List[Union[str, int, UUID]], 
    player_out_id: Union[str, int, UUID], 
    player_in_id: Union[str, int, UUID]
) -> List[Union[str, int, UUID]]:
    """
    Validates and processes a substitution in a basketball lineup.
    
    If player_out_id is not in the current lineup, or the resulting lineup 
    doesn't have exactly 5 unique players, raises a DomainValidationError.
    
    Returns:
        List: A new lineup list containing the active player IDs (preserving original types).
    """
    if current_lineup is None:
        raise DomainValidationError("Lineup cannot be None.")
        
    # Check if the player leaving is actually in the lineup
    norm_out = _normalize_id(player_out_id)
    out_idx = -1
    for i, p in enumerate(current_lineup):
        if _normalize_id(p) == norm_out:
            out_idx = i
            break
            
    if out_idx == -1:
        raise DomainValidationError(
            f"Substitution failed: Player out ID '{player_out_id}' is not in the current lineup."
        )
    
    # Construct the candidate lineup
    new_lineup = list(current_lineup)
    new_lineup[out_idx] = player_in_id
    
    # Ensure there are no duplicate players in the resulting lineup
    unique_players = set()
    for p in new_lineup:
        norm_p = _normalize_id(p)
        if norm_p in unique_players:
            raise DomainValidationError(
                f"Substitution failed: Player in ID '{player_in_id}' is already active in the lineup."
            )
        unique_players.add(norm_p)
        
    if len(new_lineup) != 5:
        raise DomainValidationError(
            f"Substitution failed: Resulting lineup must have exactly 5 players, got {len(new_lineup)}."
        )
        
    return new_lineup


class LiveGameState:
    """
    State machine that can ingest a cumulative sequence of game events
    and compute the exact live state (score, active lineups, etc.) of a match.
    """
    def __init__(
        self,
        home_team_id: Union[str, int, UUID],
        away_team_id: Union[str, int, UUID],
        initial_home_lineup: Optional[List[Union[str, int, UUID]]] = None,
        initial_away_lineup: Optional[List[Union[str, int, UUID]]] = None,
    ):
        self.home_team_id = _normalize_id(home_team_id)
        self.away_team_id = _normalize_id(away_team_id)
        
        self.current_score: Dict[str, int] = {"HOME": 0, "AWAY": 0}
        
        # Initialize active lineups. They should contain exactly 5 players.
        self.active_lineups: Dict[str, List[Union[str, int, UUID]]] = {
            "HOME": list(initial_home_lineup) if initial_home_lineup else [],
            "AWAY": list(initial_away_lineup) if initial_away_lineup else []
        }

    def _get_team_key(self, team_id: Any) -> Optional[str]:
        """Maps a team ID to 'HOME' or 'AWAY'."""
        if team_id is None:
            return None
        norm_team_id = _normalize_id(team_id)
        if norm_team_id == self.home_team_id:
            return "HOME"
        elif norm_team_id == self.away_team_id:
            return "AWAY"
        return None

    def _extract_field(self, event: Any, field_name: str) -> Any:
        """Safely extracts field values from Pydantic models, SQLAlchemy objects, or dicts."""
        if isinstance(event, dict):
            return event.get(field_name)
        return getattr(event, field_name, None)

    def ingest_event(self, event: Any) -> None:
        """
        Ingests a single GameEvent record and updates the live match state.
        Supports dictionaries, Pydantic objects, or SQLAlchemy model instances.
        """
        # Extract event type (and clean it if it is an Enum)
        raw_event_type = self._extract_field(event, "event_type")
        if raw_event_type is None:
            return
        
        # Normalize event type to a string
        if hasattr(raw_event_type, "value"):
            event_type_str = str(raw_event_type.value)
        elif hasattr(raw_event_type, "name"):
            event_type_str = str(raw_event_type.name)
        else:
            event_type_str = str(raw_event_type)
            
        event_type_str = event_type_str.upper()

        # Extract team ID and map to HOME/AWAY
        team_id = self._extract_field(event, "team_id")
        team_key = self._get_team_key(team_id)

        # Extract metadata (which could be called metadata or metadata_json)
        metadata = self._extract_field(event, "metadata_json") or self._extract_field(event, "metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}

        # 1. Update Score
        if team_key:
            if event_type_str == "SHOT_MADE":
                # Look for shot_value in metadata, then check shot_location if present
                shot_val = metadata.get("shot_value")
                if shot_val is None:
                    # Also try to extract from shot_location
                    shot_loc = self._extract_field(event, "shot_location")
                    if shot_loc:
                        shot_val = self._extract_field(shot_loc, "shot_value")
                
                # Default to 2 if not found or invalid
                try:
                    score_increment = int(shot_val) if shot_val is not None else 2
                except (ValueError, TypeError):
                    score_increment = 2
                    
                self.current_score[team_key] += score_increment

            elif event_type_str == "FREE_THROW_MADE":
                shot_val = metadata.get("shot_value")
                try:
                    score_increment = int(shot_val) if shot_val is not None else 1
                except (ValueError, TypeError):
                    score_increment = 1
                
                self.current_score[team_key] += score_increment

        # 2. Update Active Lineups via substitutions
        if event_type_str == "SUBSTITUTION" and team_key:
            player_out_id = metadata.get("player_out_id")
            player_in_id = metadata.get("player_in_id")
            
            if player_out_id is not None and player_in_id is not None:
                current_lineup = self.active_lineups[team_key]
                # If active lineup was empty or had less than 5 players (e.g. uninitialized),
                # we only perform the substitution validation/update if we have a full lineup.
                # If not, we still update it to build up to 5 if required, or validate when full.
                if len(current_lineup) == 5:
                    updated_lineup = process_substitution(
                        current_lineup, player_out_id, player_in_id
                    )
                    self.active_lineups[team_key] = updated_lineup
                else:
                    # For uninitialized lineups or partial lineups, we handle substitution gracefully:
                    # replace player_out if present, otherwise just ensure player_in is in,
                    # but let's keep it robust and raise validation if they try to substitute on a partial lineup of 5.
                    norm_out = _normalize_id(player_out_id)
                    lineup_str = [_normalize_id(p) for p in current_lineup]
                    if norm_out in lineup_str:
                        idx = lineup_str.index(norm_out)
                        current_lineup[idx] = player_in_id
                    else:
                        raise DomainValidationError(
                            f"Substitution failed: Player out ID '{player_out_id}' is not in the active lineup."
                        )

    def ingest_events(self, events: List[Any]) -> None:
        """
        Ingests a list of events sequentially to update the state.
        """
        for event in events:
            self.ingest_event(event)
