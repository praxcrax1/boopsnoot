import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  textAlignVertical,
  autoCapitalize = 'none',
  style,
  required = false,
  error = null,
  touched = false,
  onBlur = () => {},
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.requiredMark}>*</Text>}
        </Text>
      )}
      <View style={[
        styles.inputContainer, 
        error && touched && styles.errorInput,
        style
      ]}>
        <TextInput
          style={[
            styles.input,
            multiline && styles.textArea,
          ]}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={textAlignVertical}
          autoCapitalize={autoCapitalize}
          onBlur={onBlur}
        />
        {touched && error && (
          <Ionicons name="alert-circle" size={20} color="#FF3B30" style={styles.errorIcon} />
        )}
      </View>
      {touched && error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  requiredMark: {
    color: '#FF6B6B',
  },
  inputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorInput: {
    borderColor: '#FF3B30',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  errorIcon: {
    marginRight: 10,
  }
});

export default InputField;