import React from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';

interface PrivacyContentProps {
  colors: {
    text: string;
    icon: string;
  };
}

const PrivacyContent: React.FC<PrivacyContentProps> = ({ colors }) => {
  return (
    <View>
      <Text style={[styles.title, { color: colors.text }]}>Privacy Policy</Text>
      <Text style={[styles.lastUpdated, { color: colors.text }]}>Last Updated: [Date]</Text>

      <Text style={[styles.paragraph, { color: colors.text }]}>
        Welcome to SecureChat. SecureChat is committed to protecting your privacy. This Privacy Policy explains how information is collected, used, disclosed, and safeguarded when you use the SecureChat application (the "App"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the app.
      </Text>

      <Text style={[styles.heading, { color: colors.text }]}>1. Collection of Your Information</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        Due to the nature of the App (end-to-end encryption, zero-knowledge architecture), minimal information is collected:
      </Text>
      <View style={styles.list}>
        <Text style={[styles.listItem, { color: colors.text }]}>• Account Information: Information needed to create your account, such as a username or identifier, may be collected. Personally identifiable information like email addresses or phone numbers is not required unless explicitly stated for specific optional features (like account recovery, if offered).</Text>
        <Text style={[styles.listItem, { color: colors.text }]}>• Usage Data: Anonymous, aggregated data about how the App is used (e.g., feature usage frequency) may be collected to improve performance and user experience. This data cannot be linked back to individual users or their conversations.</Text>
      </View>
      <Text style={[styles.paragraph, { color: colors.text }]}>SecureChat DOES NOT collect, store, or have access to:</Text>
      <View style={styles.list}>
        <Text style={[styles.listItem, { color: colors.text }]}>• Your message content.</Text>
        <Text style={[styles.listItem, { color: colors.text }]}>• Your conversation passwords.</Text>
        <Text style={[styles.listItem, { color: colors.text }]}>• Your encryption keys.</Text>
        <Text style={[styles.listItem, { color: colors.text }]}>• Your contacts (unless you explicitly grant permission for features like contact discovery, and even then, it may be processed ephemerally or in a privacy-preserving manner).</Text>
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>2. Use of Your Information</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>The minimal information collected is used solely for the purpose of:</Text>
      <View style={styles.list}>
        <Text style={[styles.listItem, { color: colors.text }]}>• Providing, operating, and maintaining the App.</Text>
        <Text style={[styles.listItem, { color: colors.text }]}>• Improving the App's performance and features based on aggregated, anonymous usage patterns.</Text>
        <Text style={[styles.listItem, { color: colors.text }]}>• Troubleshooting technical issues (based on non-personal data).</Text>
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>3. Disclosure of Your Information</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>Your personal information is not sold, traded, rented, or otherwise shared with third parties. As minimal personal data is collected and there is no access to your encrypted communications, there is virtually nothing to disclose.</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>Aggregated, anonymous information that does not identify any individual user may be disclosed without restriction.</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>
        <Text style={{ fontWeight: 'bold', color: colors.text }}>Legal Requirements and Safety:</Text> Notwithstanding the zero-knowledge architecture, available information (such as aggregated usage data or account identifiers if collected) may be disclosed if required to do so by law or in the good faith belief that such action is necessary to (i) comply with a legal obligation, (ii) protect and defend the rights or property related to SecureChat, (iii) act in urgent circumstances to protect the personal safety of users of the Service or the public, or (iv) protect against legal liability. SecureChat is intended for lawful purposes only. Use of the Service for any criminal activity is strictly prohibited. While the end-to-end encryption limits access to user communications, cooperation with law enforcement agencies will occur as required by law and to the extent technically feasible with the limited data possessed, regarding investigations into illegal activities conducted using the Service. By using the Service, you acknowledge and agree that you are solely responsible for your actions and communications.
      </Text>

      <Text style={[styles.heading, { color: colors.text }]}>4. Security of Your Information</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>Administrative, technical, and physical security measures are used to help protect your information. While reasonable steps have been taken to secure the information provided, please be aware that despite these efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse. The core security of your conversations relies on the end-to-end encryption and your management of conversation passwords and device security. You are solely responsible for maintaining the security of your device and passwords.</Text>

      <Text style={[styles.heading, { color: colors.text }]}>5. Policy for Children</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>Information is not knowingly solicited from or marketed to children under the age of 13. If you become aware of any data collected from children under age 13, please use the contact information provided below.</Text>

      <Text style={[styles.heading, { color: colors.text }]}>6. Changes to This Privacy Policy</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>This Privacy Policy may be updated from time to time. You will be notified of any changes by posting the new Privacy Policy within the App or on the SecureChat website. You are advised to review this Privacy Policy periodically for any changes.</Text>

      <Text style={[styles.heading, { color: colors.text }]}>7. Contact</Text>
      <Text style={[styles.paragraph, { color: colors.text }]}>If you have questions or comments about this Privacy Policy, please contact: <Text style={{ color: 'blue' }} onPress={() => Linking.openURL("mailto:rishabh.1keshri@gmail.com")}>rishabh.1keshri@gmail.com</Text></Text>
    </View>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  lastUpdated: {
    marginBottom: 10,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  paragraph: {
    marginBottom: 10,
  },
  list: {
    marginBottom: 10,
    paddingLeft: 20,
  },
  listItem: {
    marginLeft: 10,
  },
});

export default PrivacyContent;
