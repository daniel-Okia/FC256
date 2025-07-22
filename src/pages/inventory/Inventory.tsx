import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Search, Download, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InventoryService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { InventoryItem, InventoryCategory, InventoryStatus, InventoryCondition } from '../../types';
import { formatDate } from '../../utils/date-utils';
import { formatUGX } from '../../utils/currency-utils';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { useForm } from 'react-hook-form';

interface InventoryFormData {
  name: string;
  category: InventoryCategory;
  description: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  condition: InventoryCondition;
  location: string;
}

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  const canManageInventory = user && canUserAccess(user.role, Permissions.MANAGE_INVENTORY);
  const canExport = user && canUserAccess(user.role, Permissions.EXPORT_REPORTS);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InventoryFormData>();

  const watchQuantity = watch('quantity');
  const watchMinQuantity = watch('minQuantity');

  // Category options with icons
  const categoryOptions = [
    { value: 'playing_equipment', label: '⚽ Playing Equipment' },
    { value: 'training_equipment', label: '🏃 Training Equipment' },
    { value: 'medical_supplies', label: '🏥 Medical Supplies' },
    { value: 'uniforms', label: '👕 Uniforms & Apparel' },
    { value: 'accessories', label: '🎽 Accessories' },
    { value: 'maintenance', label: '🔧 Maintenance Tools' },
    { value: 'other', label: '📦 Other' },
  ];

  const statusOptions = [
    { value: 'fully_stocked', label: 'Fully Stocked' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'needs_replacement', label: 'Needs Replacement' },
  ];

  const conditionOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
    { value: 'damaged', label: 'Damaged' },
  ];

  const filterCategoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categoryOptions,
  ];

  const filterStatusOptions = [
    { value: 'all', label: 'All Status' },
    ...statusOptions,
  ];

  // Load inventory items
  useEffect(() => {
    const loadInventoryItems = async () => {
      try {
        setLoading(true);
        const items = await InventoryService.getAllInventoryItems();
        setInventoryItems(items);
      } catch (error) {
        console.error('Error loading inventory items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInventoryItems();

    // Set up real-time listener
    const unsubscribe = InventoryService.subscribeToInventory((items) => {
      setInventoryItems(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-calculate status based on quantity
  const calculateStatus = (quantity: number, minQuantity: number): InventoryStatus => {
    if (quantity === 0) return 'out_of_stock';
    if (quantity <= minQuantity) return 'low_stock';
    return 'fully_stocked';
  };

  // Filter inventory items
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    totalItems: inventoryItems.length,
    lowStockItems: inventoryItems.filter(item => 
      item.status === 'low_stock' || item.status === 'out_of_stock'
    ).length,
    fullyStockedItems: inventoryItems.filter(item => item.status === 'fully_stocked').length,
    needsReplacement: inventoryItems.filter(item => item.status === 'needs_replacement').length,
  };

  const getStatusBadgeVariant = (status: InventoryStatus) => {
    switch (status) {
      case 'fully_stocked':
        return 'success';
      case 'low_stock':
        return 'warning';
      case 'out_of_stock':
        return 'danger';
      case 'needs_replacement':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConditionBadgeVariant = (condition: InventoryCondition) => {
    switch (condition) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'info';
      case 'fair':
        return 'warning';
      case 'poor':
        return 'danger';
      case 'damaged':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: InventoryCategory) => {
    switch (category) {
      case 'playing_equipment':
        return '⚽';
      case 'training_equipment':
        return '🏃';
      case 'medical_supplies':
        return '🏥';
      case 'uniforms':
        return '👕';
      case 'accessories':
        return '🎽';
      case 'maintenance':
        return '🔧';
      default:
        return '📦';
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Item',
      render: (item: InventoryItem) => (
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getCategoryIcon(item.category)}</span>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {item.name}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {item.description}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
          {item.category.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'quantity',
      title: 'Stock Level',
      render: (item: InventoryItem) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {item.quantity} / {item.maxQuantity} {item.category === 'uniforms' ? 'sets' : 'units'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Min: {item.minQuantity} {item.category === 'uniforms' ? 'sets' : 'units'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: InventoryItem) => (
        <Badge
          variant={getStatusBadgeVariant(item.status)}
          className="capitalize"
        >
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'condition',
      title: 'Condition',
      render: (item: InventoryItem) => (
        <Badge
          variant={getConditionBadgeVariant(item.condition)}
          className="capitalize"
        >
          {item.condition}
        </Badge>
      ),
    },
    {
      key: 'location',
      title: 'Location',
      render: (item: InventoryItem) => (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {item.location}
        </span>
      ),
    },
    {
      key: 'lastChecked',
      title: 'Last Checked',
      render: (item: InventoryItem) => (
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(item.lastChecked)}
          </div>
          {item.membersInCharge && item.membersInCharge.filter(id => id).length > 0 && (
            <div className="text-xs text-gray-400 dark:text-gray-500">
              {item.membersInCharge.filter(id => id).length} member{item.membersInCharge.filter(id => id).length > 1 ? 's' : ''} assigned
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (item: InventoryItem) => (
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleView(item);
            }}
            className="p-1"
          >
            <Eye size={14} />
          </Button>
          {canManageInventory && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(item);
                }}
                className="p-1"
              >
                <Edit size={14} />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(item);
                }}
                className="p-1"
              >
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    setEditingItem(null);
    reset({
      name: '',
      category: 'playing_equipment',
      description: '',
      quantity: 0,
      minQuantity: 1,
      maxQuantity: 10,
      condition: 'good',
      location: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setValue('name', item.name);
    setValue('category', item.category);
    setValue('description', item.description || '');
    setValue('quantity', item.quantity);
    setValue('minQuantity', item.minQuantity);
    setValue('maxQuantity', item.maxQuantity);
    setValue('condition', item.condition);
    setValue('location', item.location);
    setIsModalOpen(true);
  };

  const handleView = (item: InventoryItem) => {
    setViewingItem(item);
    setIsViewModalOpen(true);
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        await InventoryService.deleteInventoryItem(itemToDelete.id);
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting inventory item:', error);
      }
    }
  };

  const onSubmit = async (data: InventoryFormData) => {
    try {
      setSubmitting(true);
      console.log('Form data received:', data);
      
      // Auto-calculate status based on quantity
      const status = calculateStatus(data.quantity, data.minQuantity);
      
      const itemData = {
        name: data.name,
        category: data.category,
        description: data.description || '',
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        condition: data.condition,
        location: data.location,
        status,
        lastChecked: new Date().toISOString(),
        checkedBy: user?.id || '',
      };

      console.log('Submitting inventory item:', itemData);

      if (editingItem) {
        await InventoryService.updateInventoryItem(editingItem.id, itemData);
        console.log('Item updated successfully');
      } else {
        const newItemId = await InventoryService.createInventoryItem(itemData);
        console.log('Item created successfully with ID:', newItemId);
      }

      setIsModalOpen(false);
      reset();
      setEditingItem(null);
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert(`Failed to save inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Get unit label based on category
  const getUnitLabel = (category: InventoryCategory): string => {
    if (category === 'uniforms') {
      return 'sets';
    }
    return 'units';
  };

  const watchCategory = watch('category');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track and manage team equipment and supplies"
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            {canManageInventory && (
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                onClick={handleCreate}
                className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
              >
                Add Item
              </Button>
            )}
            {canExport && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {formatDate(item.lastChecked)}
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Items
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {stats.totalItems}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                Fully Stocked
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {stats.fullyStockedItems}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Low Stock
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {stats.lowStockItems}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Needs Replacement
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.needsReplacement}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search items by name, description, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search size={18} />}
          fullWidth
        />
        
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={filterCategoryOptions}
        />
        
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          options={filterStatusOptions}
        />
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Low Stock Alert
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {stats.lowStockItems} item{stats.lowStockItems > 1 ? 's' : ''} need restocking. Check inventory levels and reorder as needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {filteredItems.length > 0 ? (
        <div className="w-full overflow-hidden">
          <Table
            data={filteredItems}
            columns={columns}
            onRowClick={(item) => handleView(item)}
            className="w-full"
          />
        </div>
      ) : (
        <EmptyState
          title={searchTerm || filterCategory !== 'all' || filterStatus !== 'all' ? "No items found" : "No inventory items yet"}
          description={
            searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
              ? "No items match your current filters. Try adjusting your search or filters."
              : "Start tracking your team equipment and supplies."
          }
          icon={<Package size={24} />}
          action={
            canManageInventory && !searchTerm && filterCategory === 'all' && filterStatus === 'all'
              ? {
                  label: 'Add First Item',
                  onClick: handleCreate,
                }
              : undefined
          }
        />
      )}

      {/* View Item Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Item Details"
        size="xl"
      >
        {viewingItem && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <span className="text-4xl">{getCategoryIcon(viewingItem.category)}</span>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {viewingItem.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {viewingItem.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <p className="text-gray-900 dark:text-white capitalize">
                    {viewingItem.category.replace('_', ' ')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Stock
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {viewingItem.quantity} units
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Stock Range
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    Min: {viewingItem.minQuantity} • Max: {viewingItem.maxQuantity}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <Badge
                    variant={getStatusBadgeVariant(viewingItem.status)}
                    className="capitalize"
                  >
                    {viewingItem.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Condition
                  </label>
                  <Badge
                    variant={getConditionBadgeVariant(viewingItem.condition)}
                    className="capitalize"
                  >
                    {viewingItem.condition}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {viewingItem.location}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Checked
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(viewingItem.lastChecked)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              {canManageInventory && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    handleEdit(viewingItem);
                  }}
                  leftIcon={<Edit size={16} />}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  Edit Item
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Inventory Item' : 'Add Inventory Item'}
        size="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Item Name"
              placeholder="e.g., Soccer Balls, Training Cones"
              error={errors.name?.message}
              required
              {...register('name', { required: 'Item name is required' })}
            />

            <Select
              label="Category"
              options={categoryOptions}
              placeholder="Select category"
              error={errors.category?.message}
              required
              {...register('category', { required: 'Category is required' })}
            />
          </div>

          <Input
            label="Description"
            placeholder="Brief description of the item"
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label={`Current Quantity (${getUnitLabel(watchCategory || 'playing_equipment')})`}
              type="number"
              min="0"
              error={errors.quantity?.message}
              required
              {...register('quantity', { 
                required: 'Quantity is required',
                min: { value: 0, message: 'Quantity cannot be negative' },
                valueAsNumber: true
              })}
            />

            <Input
              label={`Minimum Stock Level (${getUnitLabel(watchCategory || 'playing_equipment')})`}
              type="number"
              min="0"
              error={errors.minQuantity?.message}
              required
              helperText={`Alert when ${getUnitLabel(watchCategory || 'playing_equipment')} fall below this level`}
              {...register('minQuantity', { 
                required: 'Minimum quantity is required',
                min: { value: 0, message: 'Minimum quantity cannot be negative' },
                valueAsNumber: true
              })}
            />

            <Input
              label={`Maximum Stock Level (${getUnitLabel(watchCategory || 'playing_equipment')})`}
              type="number"
              min="1"
              error={errors.maxQuantity?.message}
              required
              helperText={`Target maximum ${getUnitLabel(watchCategory || 'playing_equipment')}`}
              {...register('maxQuantity', { 
                required: 'Maximum quantity is required',
                min: { value: 1, message: 'Maximum quantity must be at least 1' },
                validate: (value) => {
                  const minQty = watchMinQuantity;
                  return value > minQty || 'Maximum must be greater than minimum';
                },
                valueAsNumber: true
              })}
            />
          </div>

          {/* Stock Level Indicator */}
          {watchQuantity !== undefined && watchMinQuantity !== undefined && (
            <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Stock Level Preview</h4>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Current: {watchQuantity} {getUnitLabel(watchCategory || 'playing_equipment')}</span>
                    <span>Min: {watchMinQuantity}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        watchQuantity === 0 
                          ? 'bg-red-500'
                          : watchQuantity <= watchMinQuantity 
                          ? 'bg-yellow-500' 
                          : 'bg-green-500'
                      }`}
                      style={{ 
                        width: `${Math.min((watchQuantity / (watchMinQuantity * 2)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                <Badge
                  variant={
                    watchQuantity === 0 
                      ? 'danger'
                      : watchQuantity <= watchMinQuantity 
                      ? 'warning' 
                      : 'success'
                  }
                >
                  {calculateStatus(watchQuantity, watchMinQuantity).replace('_', ' ')}
                </Badge>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Condition"
              options={conditionOptions}
              placeholder="Select condition"
              error={errors.condition?.message}
              required
              {...register('condition', { required: 'Condition is required' })}
            />

            <Input
              label="Location"
              placeholder="e.g., Equipment Room, Field Storage"
              error={errors.location?.message}
              required
              {...register('location', { required: 'Location is required' })}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={submitting}
              className="bg-primary-600 hover:bg-primary-700 text-white w-full sm:w-auto"
            >
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Inventory Item"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              className="w-full sm:w-auto"
            >
              Delete Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;