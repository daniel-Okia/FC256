import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/layout/Layout';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Table from '../../components/ui/Table';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { Package, Plus, Edit, Trash2, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_replacement';
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
  createdAt: Date;
  updatedAt: Date;
}

interface InventoryFormData {
  name: string;
  category: string;
  description: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_replacement';
  location: string;
}

const CATEGORIES = [
  'Training Equipment',
  'Match Equipment',
  'Safety Gear',
  'Maintenance Tools',
  'Office Supplies',
  'Medical Supplies',
  'Other'
];

const CONDITIONS = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'needs_replacement', label: 'Needs Replacement' }
];

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    category: '',
    description: '',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    condition: 'good',
    location: ''
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const itemsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as InventoryItem[];
      setItems(itemsData);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (current: number, min: number, max: number): InventoryItem['status'] => {
    if (current === 0) return 'out_of_stock';
    if (current < min) return 'low_stock';
    if (current > max) return 'overstocked';
    return 'in_stock';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('Form submission started', { formData, editingItem });
      
      const status = calculateStatus(formData.currentStock, formData.minStock, formData.maxStock);
      
      const itemData = {
        ...formData,
        status,
        updatedAt: new Date()
      };

      if (editingItem) {
        console.log('Updating existing item:', editingItem.id);
        await updateDoc(doc(db, 'inventory', editingItem.id), itemData);
        console.log('Item updated successfully');
      } else {
        console.log('Creating new item');
        const docRef = await addDoc(collection(db, 'inventory'), {
          ...itemData,
          createdAt: new Date()
        });
        console.log('Item created successfully with ID:', docRef.id);
      }

      await fetchItems();
      resetForm();
      setShowModal(false);
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert(`Error saving item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      description: item.description,
      currentStock: item.currentStock,
      minStock: item.minStock,
      maxStock: item.maxStock,
      condition: item.condition,
      location: item.location
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteDoc(doc(db, 'inventory', id));
        await fetchItems();
      } catch (error) {
        console.error('Error deleting inventory item:', error);
        alert('Error deleting item');
      }
    }
  };

  const handleView = (item: InventoryItem) => {
    setViewingItem(item);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      condition: 'good',
      location: ''
    });
    setEditingItem(null);
  };

  const getStatusBadge = (status: InventoryItem['status']) => {
    const statusConfig = {
      in_stock: { color: 'green' as const, label: 'In Stock' },
      low_stock: { color: 'yellow' as const, label: 'Low Stock' },
      out_of_stock: { color: 'red' as const, label: 'Out of Stock' },
      overstocked: { color: 'blue' as const, label: 'Overstocked' }
    };
    
    const config = statusConfig[status];
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const getConditionBadge = (condition: InventoryItem['condition']) => {
    const conditionConfig = {
      excellent: { color: 'green' as const, label: 'Excellent' },
      good: { color: 'blue' as const, label: 'Good' },
      fair: { color: 'yellow' as const, label: 'Fair' },
      poor: { color: 'orange' as const, label: 'Poor' },
      needs_replacement: { color: 'red' as const, label: 'Needs Replacement' }
    };
    
    const config = conditionConfig[condition];
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  // Statistics
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock').length;
  const needsReplacementItems = items.filter(item => item.condition === 'needs_replacement').length;

  const columns = [
    { key: 'name', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'status', label: 'Status' },
    { key: 'condition', label: 'Condition' },
    { key: 'location', label: 'Location' },
    { key: 'actions', label: 'Actions' }
  ];

  const tableData = items.map(item => ({
    ...item,
    status: getStatusBadge(item.status),
    condition: getConditionBadge(item.condition),
    actions: (
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleView(item)}
          className="text-blue-600 hover:text-blue-800"
        >
          <Eye className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(item)}
          className="text-green-600 hover:text-green-800"
        >
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(item.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    )
  }));

  if (loading) {
    return (
      <Layout>
        <LoadingSpinner />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Inventory Management"
          description="Track and manage club equipment and supplies"
          action={
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          }
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <Package className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900">{lowStockItems}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <CheckCircle className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Needs Replacement</p>
                <p className="text-2xl font-bold text-gray-900">{needsReplacementItems}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          {items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No inventory items"
              description="Start by adding your first inventory item to track equipment and supplies."
              action={
                <Button onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              }
            />
          ) : (
            <Table columns={columns} data={tableData} />
          )}
        </Card>

        {/* Add/Edit Modal */}
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title={editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Item Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </Select>
            </div>

            <Input
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Current Stock"
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                min="0"
                required
              />
              
              <Input
                label="Minimum Stock"
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                min="0"
                required
              />
              
              <Input
                label="Maximum Stock"
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                min="0"
                required
              />
            </div>

            {/* Stock Level Preview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Stock Level Preview</h4>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Status:</span>
                {getStatusBadge(calculateStatus(formData.currentStock, formData.minStock, formData.maxStock))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Condition"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as InventoryFormData['condition'] })}
                required
              >
                {CONDITIONS.map(condition => (
                  <option key={condition.value} value={condition.value}>
                    {condition.label}
                  </option>
                ))}
              </Select>
              
              <Input
                label="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Equipment Room, Storage A1"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* View Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Inventory Item Details"
        >
          {viewingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                  <p className="text-gray-900">{viewingItem.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <p className="text-gray-900">{viewingItem.category}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <p className="text-gray-900">{viewingItem.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <p className="text-gray-900">{viewingItem.currentStock}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                  <p className="text-gray-900">{viewingItem.minStock}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
                  <p className="text-gray-900">{viewingItem.maxStock}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {getStatusBadge(viewingItem.status)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                  {getConditionBadge(viewingItem.condition)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <p className="text-gray-900">{viewingItem.location}</p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={() => setShowViewModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default Inventory;