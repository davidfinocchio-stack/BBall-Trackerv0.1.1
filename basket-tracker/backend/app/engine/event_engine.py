class DomainValidationError(Exception):
    """
    Custom exception raised when domain-specific business rules or schema requirements
    are violated.
    """
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def validate_event_telemetry(event_type: str, metadata: dict) -> bool:
    """
    Performs strict contextual validation on flexible event telemetry JSON payload.

    Args:
        event_type (str): The type of basketball event (e.g. 'SHOT_MADE', 'SUBSTITUTION').
        metadata (dict): Flexible dictionary containing event metadata.

    Returns:
        bool: True if the telemetry payload conforms to strict domain rules.

    Raises:
        DomainValidationError: If any required metadata fields are missing or have incorrect types.
    """
    if metadata is None:
        raise DomainValidationError("Metadata payload cannot be None.")
    
    if not isinstance(metadata, dict):
        raise DomainValidationError(f"Metadata must be a dictionary, got {type(metadata).__name__}.")

    # 1. Validation for SHOT_MADE and SHOT_MISSED
    if event_type in ("SHOT_MADE", "SHOT_MISSED"):
        # shooter_id validation (can be str/UUID/int)
        if "shooter_id" not in metadata:
            raise DomainValidationError(
                f"Event type '{event_type}' requires a 'shooter_id' in its metadata."
            )
        shooter_id = metadata["shooter_id"]
        if shooter_id is None or not isinstance(shooter_id, (str, int)):
            raise DomainValidationError(
                f"Metadata 'shooter_id' must be a non-empty string, UUID, or integer, got {type(shooter_id).__name__}."
            )

        # shot_type validation (must be str)
        if "shot_type" not in metadata:
            raise DomainValidationError(
                f"Event type '{event_type}' requires a 'shot_type' in its metadata."
            )
        shot_type = metadata["shot_type"]
        if not isinstance(shot_type, str) or not shot_type.strip():
            raise DomainValidationError(
                f"Metadata 'shot_type' must be a non-empty string, got {type(shot_type).__name__}."
            )

        # contested validation (must be bool)
        if "contested" not in metadata:
            raise DomainValidationError(
                f"Event type '{event_type}' requires a 'contested' flag in its metadata."
            )
        contested = metadata["contested"]
        if not isinstance(contested, bool):
            raise DomainValidationError(
                f"Metadata 'contested' must be a boolean, got {type(contested).__name__}."
            )

    # 2. Validation for SUBSTITUTION
    elif event_type == "SUBSTITUTION":
        # player_out_id validation
        if "player_out_id" not in metadata:
            raise DomainValidationError(
                "Event type 'SUBSTITUTION' requires 'player_out_id' in its metadata."
            )
        player_out_id = metadata["player_out_id"]
        if player_out_id is None or not isinstance(player_out_id, (str, int)):
            raise DomainValidationError(
                f"Metadata 'player_out_id' must be a valid identifier (string, UUID, or int), got {type(player_out_id).__name__}."
            )

        # player_in_id validation
        if "player_in_id" not in metadata:
            raise DomainValidationError(
                "Event type 'SUBSTITUTION' requires 'player_in_id' in its metadata."
            )
        player_in_id = metadata["player_in_id"]
        if player_in_id is None or not isinstance(player_in_id, (str, int)):
            raise DomainValidationError(
                f"Metadata 'player_in_id' must be a valid identifier (string, UUID, or int), got {type(player_in_id).__name__}."
            )

    # 3. Validation for DEFLECTION
    elif event_type == "DEFLECTION":
        # player_id validation
        if "player_id" not in metadata:
            raise DomainValidationError(
                "Event type 'DEFLECTION' requires 'player_id' in its metadata."
            )
        player_id = metadata["player_id"]
        if player_id is None or not isinstance(player_id, (str, int)):
            raise DomainValidationError(
                f"Metadata 'player_id' must be a valid identifier (string, UUID, or int), got {type(player_id).__name__}."
            )

        # possession_retained validation
        if "possession_retained" not in metadata:
            raise DomainValidationError(
                "Event type 'DEFLECTION' requires 'possession_retained' in its metadata."
            )
        possession_retained = metadata["possession_retained"]
        if not isinstance(possession_retained, bool):
            raise DomainValidationError(
                f"Metadata 'possession_retained' must be a boolean, got {type(possession_retained).__name__}."
            )

    return True
