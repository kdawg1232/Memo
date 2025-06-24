import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'

interface ColorPickerProps {
  currentColor: string
  onColorChange: (color: string) => void
  disabled?: boolean
}

// Predefined colors for pin customization
const AVAILABLE_COLORS = [
  '#FF6B35', // Orange (default)
  '#4ECDC4', // Teal
  '#FFA726', // Light Orange
  '#E53E3E', // Red
  '#38A169', // Green
  '#3182CE', // Blue
  '#805AD5', // Purple
  '#EC4899', // Pink
  '#F56565', // Light Red
  '#48BB78', // Light Green
  '#4299E1', // Light Blue
  '#9F7AEA', // Light Purple
  '#ED8936', // Amber
  '#38B2AC', // Cyan
  '#667EEA', // Indigo
  '#2D3748', // Dark Gray
]

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  currentColor, 
  onColorChange, 
  disabled = false 
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [selectedColor, setSelectedColor] = useState(currentColor)

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
  }

  const handleConfirm = () => {
    if (selectedColor !== currentColor) {
      onColorChange(selectedColor)
    }
    setIsModalVisible(false)
  }

  const handleCancel = () => {
    setSelectedColor(currentColor) // Reset to original color
    setIsModalVisible(false)
  }

  const openColorPicker = () => {
    if (disabled) {
      Alert.alert('Permission Denied', 'Only you can change your own pin color.')
      return
    }
    setIsModalVisible(true)
  }

  return (
    <>
      {/* Color square button */}
      <TouchableOpacity
        style={[
          styles.colorSquare,
          { backgroundColor: currentColor },
          disabled && styles.colorSquareDisabled
        ]}
        onPress={openColorPicker}
        activeOpacity={disabled ? 1 : 0.7}
      >
        {/* Optional: Add a small edit icon overlay for the current user */}
        {!disabled && (
          <View style={styles.editOverlay}>
            <Text style={styles.editText}>✎</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Color picker modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Pin Color</Text>
            
            {/* Color grid */}
            <ScrollView 
              style={styles.colorGrid}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.colorRow}>
                {AVAILABLE_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColorOption
                    ]}
                    onPress={() => handleColorSelect(color)}
                    activeOpacity={0.7}
                  >
                    {selectedColor === color && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  colorSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginLeft: 8,
    position: 'relative',
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  colorSquareDisabled: {
    opacity: 0.7,
  },
  editOverlay: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: '#000',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 20,
  },
  colorGrid: {
    maxHeight: 300,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedColorOption: {
    borderColor: '#000000',
    borderWidth: 3,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#000000',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ColorPicker 