// src/components/RoomNavigation.jsx
import React from 'react';
import { useContext } from 'react';
import { GameContext } from '../context/GameContext';

const RoomNavigation = () => {
  const { 
    currentRoom,
    roomsUnlocked, 
    setCurrentRoom,
    addNotification,
    isPanelOpen,
    isMobile
  } = useContext(GameContext);

  // Don't show navigation if there's only one room unlocked
  if (roomsUnlocked <= 1) {
    return null;
  }

  const handleRoomChange = (newRoom) => {
    // Only navigate if the room is different and unlocked
    if (newRoom !== currentRoom && newRoom <= roomsUnlocked) {
      setCurrentRoom(newRoom);
      addNotification(`Entered Room ${newRoom}`, 400, 300, "#4CAF50");
    }
  };

  // Position completely outside the game canvas
  const navStyle = {
    position: 'absolute',
    right: '10px',
    bottom: '-40px', // Position below the game canvas
    zIndex: 6000,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    padding: '3px',
    backgroundColor: 'transparent'
  };

  // Minimalist button style
  const buttonStyle = {
    width: '25px',
    height: '25px',
    minWidth: '25px',
    padding: '0',
    margin: '0',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    border: '1px solid #4CAF50'
  };

  // Even more minimalist indicator
  const indicatorStyle = {
    fontSize: '10px',
    color: '#a0a0a0',
    margin: '0 5px'
  };

  return (
    <div className="room-navigation" style={navStyle}>
      {/* Show left arrow when in room 2 */}
      {currentRoom === 2 && (
        <button 
          className="room-nav-button prev"
          onClick={() => handleRoomChange(1)}
          aria-label="Go to previous room"
          style={buttonStyle}
        >
          ←
        </button>
      )}

      {/* Tiny room indicator */}
      <span style={indicatorStyle}>
        {currentRoom}/{roomsUnlocked}
      </span>

      {/* Show right arrow when in room 1 */}
      {currentRoom === 1 && (
        <button 
          className="room-nav-button next"
          onClick={() => handleRoomChange(2)}
          aria-label="Go to next room"
          style={buttonStyle}
        >
          →
        </button>
      )}
    </div>
  );
};

export default RoomNavigation;
