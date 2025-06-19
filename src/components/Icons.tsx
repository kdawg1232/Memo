import React from 'react'
import { Image, ImageStyle } from 'react-native'

interface IconProps {
  size?: number
  style?: ImageStyle
}

// Map icon with location pin
export const MapIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Image
    source={require('../../assets/map-icon.png')}
    style={[
      {
        width: size,
        height: size,
        resizeMode: 'contain',
      },
      style,
    ]}
  />
)

// Profile/Person icon
export const ProfileIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Image
    source={require('../../assets/profile-icon.png')}
    style={[
      {
        width: size,
        height: size,
        resizeMode: 'contain',
      },
      style,
    ]}
  />
)

// Friends/Group icon
export const FriendsIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Image
    source={require('../../assets/friends-icon.png')}
    style={[
      {
        width: size,
        height: size,
        resizeMode: 'contain',
      },
      style,
    ]}
  />
)

// Audio/Sound wave icon
export const AudioIcon: React.FC<IconProps> = ({ size = 24, style }) => (
  <Image
    source={require('../../assets/audio-icon.png')}
    style={[
      {
        width: size,
        height: size,
        resizeMode: 'contain',
      },
      style,
    ]}
  />
) 