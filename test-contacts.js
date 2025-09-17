// Test Contact Service Functionality
import { contactService } from '../src/services/contactService.js';

console.log('🧪 Testing Contact Service...');

// Initialize the service
const initResult = contactService.initialize();
console.log('✅ Service initialized:', initResult);

// Test adding a contact
const testContact = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  company: 'Test Company',
  notes: 'Test contact for debugging'
};

async function testContactOperations() {
  try {
    console.log('\n📝 Testing contact addition...');
    const addResult = await contactService.addContact(testContact);
    console.log('Add result:', addResult);

    if (addResult.success) {
      console.log('✅ Contact added successfully');
      
      console.log('\n📋 Testing contact retrieval...');
      const contacts = await contactService.getContacts();
      console.log('Retrieved contacts:', contacts);
      
      console.log('\n📊 Testing contact stats...');
      const stats = contactService.getStatistics();
      console.log('Contact statistics:', stats);
      
      console.log('\n🔍 Testing contact search...');
      const searchResults = await contactService.getContacts({ search: 'john' });
      console.log('Search results for "john":', searchResults);
      
      if (addResult.contact && addResult.contact.id) {
        console.log('\n✏️ Testing contact update...');
        const updateResult = await contactService.updateContact(addResult.contact.id, {
          company: 'Updated Test Company'
        });
        console.log('Update result:', updateResult);
        
        console.log('\n🗑️ Testing contact deletion...');
        const deleteResult = await contactService.deleteContact(addResult.contact.id);
        console.log('Delete result:', deleteResult);
      }
    } else {
      console.log('❌ Failed to add contact:', addResult.errors);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testContactOperations();

console.log('\n🎯 Contact service test completed');