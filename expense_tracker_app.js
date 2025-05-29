import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  SafeAreaView,
} from 'react-native';

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('All');

  const categories = ['Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Other'];

  const addExpense = () => {
    if (!amount || !description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newExpense = {
      id: Date.now().toString(),
      amount: parseFloat(amount),
      description: description.trim(),
      category,
      date: new Date().toLocaleDateString(),
      timestamp: new Date(),
    };

    setExpenses(prev => [newExpense, ...prev]);
    setAmount('');
    setDescription('');
    setCategory('Food');
    setShowAddModal(false);
  };

  const deleteExpense = (id) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => setExpenses(prev => prev.filter(expense => expense.id !== id))
        },
      ]
    );
  };

  const getFilteredExpenses = () => {
    if (selectedFilter === 'All') return expenses;
    return expenses.filter(expense => expense.category === selectedFilter);
  };

  const getTotalAmount = () => {
    const filtered = getFilteredExpenses();
    return filtered.reduce((total, expense) => total + expense.amount, 0);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      Food: '<}',
      Transportation: '=—',
      Entertainment: '<¬',
      Shopping: '=Í',
      Bills: '=Ä',
      Health: '<å',
      Other: '=Ý'
    };
    return icons[category] || '=Ý';
  };

  const renderExpenseItem = ({ item }) => (
    <View style={styles.expenseItem}>
      <View style={styles.expenseHeader}>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseIcon}>{getCategoryIcon(item.category)}</Text>
          <View style={styles.expenseDetails}>
            <Text style={styles.expenseDescription}>{item.description}</Text>
            <Text style={styles.expenseCategory}>{item.category} " {item.date}</Text>
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>-${item.amount.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteExpense(item.id)}
          >
            <Text style={styles.deleteButtonText}></Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFilterButton = (filterCategory) => (
    <TouchableOpacity
      key={filterCategory}
      style={[
        styles.filterButton,
        selectedFilter === filterCategory && styles.activeFilterButton
      ]}
      onPress={() => setSelectedFilter(filterCategory)}
    >
      <Text style={[
        styles.filterButtonText,
        selectedFilter === filterCategory && styles.activeFilterButtonText
      ]}>
        {filterCategory}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expense Tracker</Text>
        <Text style={styles.totalAmount}>
          Total: ${getTotalAmount().toFixed(2)}
        </Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {['All', ...categories].map(renderFilterButton)}
      </ScrollView>

      {/* Expenses List */}
      <FlatList
        data={getFilteredExpenses()}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id}
        style={styles.expensesList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first expense</Text>
          </View>
        }
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Expense</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}></Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#999"
            />

            <Text style={styles.categoryLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    category === cat && styles.activeCategoryButton
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryIcon}>{getCategoryIcon(cat)}</Text>
                  <Text style={[
                    styles.categoryButtonText,
                    category === cat && styles.activeCategoryButtonText
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={addExpense}>
              <Text style={styles.saveButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#6c5ce7',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  filterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  activeFilterButton: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: 'white',
  },
  expensesList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  expenseItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expenseIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 12,
    color: '#636e72',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff7675',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#636e72',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b2bec3',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00b894',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 28,
    color: 'white',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#dfe6e9',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 10,
  },
  categoryContainer: {
    marginBottom: 25,
  },
  categoryButton: {
    alignItems: 'center',
    padding: 12,
    marginRight: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dfe6e9',
    backgroundColor: 'white',
    minWidth: 80,
  },
  activeCategoryButton: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  categoryIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryButtonText: {
    fontSize: 12,
    color: '#636e72',
    fontWeight: '500',
  },
  activeCategoryButtonText: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#00b894',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ExpenseTracker;