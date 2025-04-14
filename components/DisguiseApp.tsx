import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useAppDispatch } from '../app/store/hooks';
import { exitSosMode } from '../app/store/slices/appStateSlice';

// Basic calculation logic (use a library like mathjs for robust calculations)
const calculate = (op1: number, operator: string | null, op2: number): number => {
  switch (operator) {
    case '+': return op1 + op2;
    case '-': return op1 - op2;
    case '*': return op1 * op2;
    case '/': return op2 === 0 ? NaN : op1 / op2; // Handle division by zero
    default: return op2; // If no operator yet, the result is the second operand
  }
};

const DisguiseApp = () => {
  const dispatch = useAppDispatch();
  const [display, setDisplay] = useState('0');
  const [operand1, setOperand1] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand2, setWaitingForOperand2] = useState(false);
  const [exitSequence, setExitSequence] = useState('');

  const handleNumberPress = (value: string) => {
    // Exit sequence check
    const newSequence = exitSequence + value;
    setExitSequence(newSequence);
    checkExitSequence(newSequence);

    if (waitingForOperand2) {
      setDisplay(value);
      setWaitingForOperand2(false);
    } else {
      setDisplay(display === '0' ? value : display + value);
    }
  };

  const handleOperatorPress = (nextOperator: string) => {
    const currentValue = parseFloat(display);

    if (operand1 !== null && operator && !waitingForOperand2) {
      // Perform previous operation
      const result = calculate(operand1, operator, currentValue);
      setDisplay(String(result));
      setOperand1(result);
    } else {
      setOperand1(currentValue);
    }

    setOperator(nextOperator);
    setWaitingForOperand2(true);
    setExitSequence(''); // Operators reset exit sequence
  };

  const handleEqualsPress = () => {
    if (operand1 === null || operator === null || waitingForOperand2) return; // Need both operands and operator

    const currentValue = parseFloat(display);
    const result = calculate(operand1, operator, currentValue);
    setDisplay(String(result));

    // Reset state for next calculation
    setOperand1(null);
    setOperator(null);
    setWaitingForOperand2(false);
    setExitSequence(''); // Reset exit sequence
  };

  const handleDecimalPress = () => {
    if (waitingForOperand2) {
        setDisplay('0.');
        setWaitingForOperand2(false);
    } else if (!display.includes('.')) {
        setDisplay(display + '.');
    }
     setExitSequence(''); // Reset exit sequence
  };

  const handleClear = () => {
    setDisplay('0');
    setOperand1(null);
    setOperator(null);
    setWaitingForOperand2(false);
    setExitSequence(''); // Clear sequence on C
  };

  const handlePlusMinus = () => {
      setDisplay(String(parseFloat(display) * -1));
       setExitSequence(''); // Reset exit sequence
  }

  const handlePercent = () => {
      setDisplay(String(parseFloat(display) / 100));
       setExitSequence(''); // Reset exit sequence
  }

  const checkExitSequence = (sequence: string) => {
    if (sequence.endsWith('1337')) { // Example exit code
      Alert.alert(
        "Exit SOS Mode?",
        "Are you sure you want to return to the normal application?",
        [
          { text: "Cancel", style: "cancel", onPress: () => setExitSequence('') },
          {
            text: "Exit",
            style: "default",
            onPress: () => {
              dispatch(exitSosMode());
            },
          },
        ]
      );
    } else if (sequence.length > 4) {
      // Keep only the last 4 digits for sequence checking
      setExitSequence(sequence.slice(-4));
    }
  };


  const renderButton = (value: string, onPress: () => void, style?: object) => (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.buttonText}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.displayContainer}>
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>{display}</Text>
      </View>
      <View style={styles.buttonGrid}>
        <View style={styles.row}>
          {renderButton(display !== '0' ? 'C' : 'AC', handleClear, styles.functionButton)}
          {renderButton('+/-', handlePlusMinus, styles.functionButton)}
          {renderButton('%', handlePercent, styles.functionButton)}
          {renderButton('/', () => handleOperatorPress('/'), styles.operatorButton)}
        </View>
        <View style={styles.row}>
          {renderButton('7', () => handleNumberPress('7'))}
          {renderButton('8', () => handleNumberPress('8'))}
          {renderButton('9', () => handleNumberPress('9'))}
          {renderButton('*', () => handleOperatorPress('*'), styles.operatorButton)}
        </View>
        <View style={styles.row}>
          {renderButton('4', () => handleNumberPress('4'))}
          {renderButton('5', () => handleNumberPress('5'))}
          {renderButton('6', () => handleNumberPress('6'))}
          {renderButton('-', () => handleOperatorPress('-'), styles.operatorButton)}
        </View>
        <View style={styles.row}>
          {renderButton('1', () => handleNumberPress('1'))}
          {renderButton('2', () => handleNumberPress('2'))}
          {renderButton('3', () => handleNumberPress('3'))}
          {renderButton('+', () => handleOperatorPress('+'), styles.operatorButton)}
        </View>
        <View style={styles.row}>
          {renderButton('0', () => handleNumberPress('0'), styles.zeroButton)}
          {renderButton('.', handleDecimalPress)}
          {renderButton('=', handleEqualsPress, styles.operatorButton)}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background for calculator
    justifyContent: 'flex-end',
  },
  displayContainer: {
    flex: 1, // Allow display to take remaining space
    justifyContent: 'flex-end',
    padding: 20,
    paddingRight: 30, // More padding on the right
    alignItems: 'flex-end',
  },
  displayText: {
    fontSize: 80, // Larger font size
    color: '#fff',
    textAlign: 'right',
  },
  buttonGrid: {
    paddingBottom: 30, // More padding at bottom
    paddingHorizontal: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Use space-between for even spacing
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#333', // Darker gray for numbers
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5, // Consistent margin
  },
  zeroButton: {
    width: 170, // Wider zero button
    alignItems: 'flex-start', // Align text left for zero
    paddingLeft: 30,
    backgroundColor: '#333',
  },
  functionButton: {
    backgroundColor: '#AFAFAF', // Lighter gray for functions
  },
  operatorButton: {
    backgroundColor: '#FF9500', // Orange for operators
  },
  buttonText: {
    fontSize: 35, // Slightly larger text
    color: '#fff',
    fontWeight: '500', // Medium weight
  },
  // Adjust text color for function buttons if needed
  functionButtonText: {
      color: '#000',
  }
});

export default DisguiseApp;
