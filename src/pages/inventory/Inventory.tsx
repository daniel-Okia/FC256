import React, { useState, useEffect } from 'react';
import { Package, Plus, Edit, Trash2, Eye, AlertTriangle, Download, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { InventoryService, MemberService } from '../../services/firestore';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import type { InventoryItem, InventoryCategory, InventoryCondition, Member } from '../../types';
import { canUserAccess, Permissions } from '../../utils/permissions';
import { InventoryPDFExporter } from '../../utils/pdf-export';
import { useForm } from 'react-hook-form';

interface InventoryFormData {
  name: string;
  category: InventoryCategory;
  description?: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number;
  condition: InventoryCondition;
  allocatedMembers: string[];
}

const Inventory: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

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
  const watchMaxQuantity = watch('maxQuantity');

  const categoryOptions = [
    { value: 'playing_equipment', label: 'Playing Equipment' },
    { value: 'training_equipment', label: 'Training Equipment' },
    { value: 'medical_supplies', label: 'Medical Supplies' },
    { value: 'uniforms', label: 'Uniforms' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
  ];

  const conditionOptions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'poor', label: 'Poor' },
    { value: 'damaged', label: 'Damaged' },
  ];

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const [itemsData, membersData] = await Promise.all([
          InventoryService.getAllInventoryItems(),
          MemberService.getAllMembers(),
        ]);
        setItems(itemsData);
        setMembers(membersData);
      } catch (error) {
        console.error('Error loading inventory items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadItems();

    // Set up real-time listener
    const unsubscribe = InventoryService.subscribeToInventory((itemsData) => {
      setItems(itemsData);
      setLoading(false);
    });

    const unsubscribeMembers = MemberService.subscribeToMembers(setMembers);

    return () => {
      unsubscribe();
      unsubscribeMembers();
    };
  }, []);

  const calculateStatus = (current: number, min: number, max: number) => {
    if (current === 0) return 'out_of_stock';
    if (current <= min) return 'low_stock';
    if (current > max) return 'overstocked';
    return 'fully_stocked';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'fully_stocked':
        return 'success';
      case 'low_stock':
        return 'warning';
      case 'out_of_stock':
        return 'danger';
      case 'needs_replacement':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getConditionBadgeVariant = (condition: string) => {
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
        return 'danger';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Item Name',
      render: (item: InventoryItem) => (
        <div className="font-medium text-gray-900 dark:text-white">
          {item.name}
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (item: InventoryItem) => (
        <span className="capitalize">
          {item.category.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'quantity',
      title: 'Stock Level',
      render: (item: InventoryItem) => (
        <div>
          <div className="font-medium">
            {item.quantity} / {item.maxQuantity}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Min: {item.minQuantity}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (item: InventoryItem) => (
        <Badge variant={getStatusBadgeVariant(item.status)} className="capitalize">
          {item.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'condition',
      title: 'Condition',
      render: (item: InventoryItem) => (
        <Badge variant={getConditionBadgeVariant(item.condition)} className="capitalize">
          {item.condition}
        </Badge>
      ),
    },
    {
      key: 'allocatedMembers',
      title: 'Allocated Members',
      render: (item: InventoryItem) => {
        if (!item.allocatedMembers || item.allocatedMembers.length === 0) {
          return <span className="text-gray-500 dark:text-gray-400">No members assigned</span>;
        }
        
        const allocatedMemberNames = item.allocatedMembers
          .map(memberId => {
            const member = members.find(m => m.id === memberId);
            return member ? member.name : 'Unknown';
          })
          .filter(name => name !== 'Unknown');
        
        if (allocatedMemberNames.length === 0) {
          return <span className="text-gray-500 dark:text-gray-400">No valid members</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {allocatedMemberNames.slice(0, 2).map((name, index) => (
              <Badge key={index} variant="info" size="sm">
                {name}
              </Badge>
            ))}
            {allocatedMemberNames.length > 2 && (
              <Badge variant="default" size="sm">
                +{allocatedMemberNames.length - 2} more
              </Badge>
            )}
          </div>
        );
      },
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
    setSelectedMembers([]);
    reset({
      name: '',
      category: 'playing_equipment',
      description: '',
      quantity: 0,
      minQuantity: 1,
      maxQuantity: 10,
      condition: 'good',
      allocatedMembers: [],
    });
    setIsModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setSelectedMembers(item.allocatedMembers || []);
    setValue('name', item.name);
    setValue('category', item.category);
    setValue('description', item.description || '');
    setValue('quantity', item.quantity);
    setValue('minQuantity', item.minQuantity);
    setValue('maxQuantity', item.maxQuantity);
    setValue('condition', item.condition);
    setValue('allocatedMembers', item.allocatedMembers || []);
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

  const handleMemberSelect = (memberId: string) => {
    if (!selectedMembers.includes(memberId)) {
      const newSelectedMembers = [...selectedMembers, memberId];
      setSelectedMembers(newSelectedMembers);
      setValue('allocatedMembers', newSelectedMembers);
    }
  };

  const handleMemberRemove = (memberId: string) => {
    const newSelectedMembers = selectedMembers.filter(id => id !== memberId);
    setSelectedMembers(newSelectedMembers);
    setValue('allocatedMembers', newSelectedMembers);
  };

  const getMemberById = (memberId: string) => {
    return members.find(m => m.id === memberId);
  };

  const availableMembers = members.filter(member => 
    !selectedMembers.includes(member.id) && member.status === 'active'
  );

  const onSubmit = async (data: InventoryFormData) => {
    try {
      setSubmitting(true);
      console.log('Form submission started', { data, editingItem });
      
      const status = calculateStatus(data.quantity, data.minQuantity, data.maxQuantity);
      
      const itemData = {
        name: data.name,
        category: data.category,
        description: data.description || '',
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        maxQuantity: data.maxQuantity,
        condition: data.condition,
        allocatedMembers: selectedMembers,
        status,
        lastChecked: new Date().toISOString(),
        checkedBy: user?.id || '',
      };

      console.log('Submitting item data:', itemData);

      if (editingItem) {
        console.log('Updating existing item:', editingItem.id);
        await InventoryService.updateInventoryItem(editingItem.id, itemData);
        console.log('Item updated successfully');
      } else {
        console.log('Creating new item');
        const id = await InventoryService.createInventoryItem(itemData);
        console.log('Item created successfully with ID:', id);
      }

      setIsModalOpen(false);
      reset();
      setSelectedMembers([]);
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert(`Error saving item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      const stats = {
        totalItems: items.length,
        lowStockItems: items.filter(item => item.status === 'low_stock' || item.status === 'out_of_stock').length,
        fullyStockedItems: items.filter(item => item.status === 'fully_stocked').length,
        needsReplacement: items.filter(item => item.condition === 'damaged' || item.condition === 'poor').length,
        totalValue: 0, // We don't track value anymore
      };
      
      const exporter = new InventoryPDFExporter();
      exporter.exportInventory({
        inventoryItems: items,
        stats,
      });
    } catch (error) {
      console.error('Error exporting inventory:', error);
    } finally {
      setExporting(false);
    }
  };

  // Statistics
  const totalItems = items.length;
  const lowStockItems = items.filter(item => 
    item.status === 'low_stock' || item.status === 'out_of_stock'
  ).length;
  const needsReplacementItems = items.filter(item => 
    item.condition === 'damaged' || item.condition === 'poor'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Equipment Inventory"
        description={`Track and manage club equipment and supplies (${totalItems} items)`}
        actions={
          <div className="flex space-x-2">
            {canManageInventory && (
              <Button 
                onClick={handleCreate} 
                leftIcon={<Plus size={18} />}
                className="bg-primary-600 hover:bg-primary-700 text-white"
              >
                Add Item
              </Button>
            )}
            {canExport && (
              <Button
                onClick={handleExport}
                leftIcon={<Download size={18} />}
                isLoading={exporting}
                variant="outline"
              >
                Export PDF
              </Button>
            )}
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Total Items
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {totalItems}
              </p>
            </div>
            <Package className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Low Stock Alert
              </p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                {lowStockItems}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Needs Attention
              </p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                {needsReplacementItems}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </div>

      <Card>
        {items.length > 0 ? (
          <Table
            data={items}
            columns={columns}
            onRowClick={(item) => handleView(item)}
          />
        ) : (
          <EmptyState
            title="No inventory items"
            description="Start by adding your first inventory item to track equipment and supplies."
            icon={<Package size={24} />}
            action={
              canManageInventory
                ? {
                    label: 'Add First Item',
                    onClick: handleCreate,
                  }
                : undefined
            }
          />
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Description"
              placeholder="e.g., Football, Training Cones"
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
            label="Description (Optional)"
            placeholder="Brief description of the item"
            error={errors.description?.message}
            {...register('description')}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              label="Current Quantity"
              type="number"
              min="0"
              placeholder="0"
              error={errors.quantity?.message}
              required
              {...register('quantity', { 
                required: 'Current quantity is required',
                min: { value: 0, message: 'Quantity cannot be negative' },
                valueAsNumber: true
              })}
            />
            
            <Input
              label="Minimum Quantity"
              type="number"
              min="0"
              placeholder="1"
              error={errors.minQuantity?.message}
              required
              {...register('minQuantity', { 
                required: 'Minimum quantity is required',
                min: { value: 0, message: 'Minimum quantity cannot be negative' },
                valueAsNumber: true
              })}
            />
            
            <Input
              label="Maximum Quantity"
              type="number"
              min="1"
              placeholder="10"
              error={errors.maxQuantity?.message}
              required
              {...register('maxQuantity', { 
                required: 'Maximum quantity is required',
                min: { value: 1, message: 'Maximum quantity must be at least 1' },
                valueAsNumber: true
              })}
            />
          </div>

          {/* Stock Level Preview */}
          {(watchQuantity !== undefined && watchMinQuantity !== undefined && watchMaxQuantity !== undefined) && (
            <div className="bg-gray-50 dark:bg-neutral-700/30 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Stock Level Preview</h4>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <Badge 
                  variant={getStatusBadgeVariant(calculateStatus(watchQuantity, watchMinQuantity, watchMaxQuantity))} 
                  className="capitalize"
                >
                  {calculateStatus(watchQuantity, watchMinQuantity, watchMaxQuantity).replace('_', ' ')}
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Allocated Members in Charge
              </label>
              
              {/* Selected Members Display */}
              {selectedMembers.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedMembers.map(memberId => {
                    const member = getMemberById(memberId);
                    return member ? (
                      <div
                        key={memberId}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300"
                      >
                        {member.name} (#{member.jerseyNumber})
                        <button
                          type="button"
                          onClick={() => handleMemberRemove(memberId)}
                          className="ml-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              
              {/* Member Selection Dropdown */}
              {availableMembers.length > 0 && (
                <select
                  className="block w-full rounded-lg shadow-sm border transition-colors duration-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-sm border-gray-300 dark:border-gray-600 dark:bg-neutral-700 dark:text-white hover:border-gray-400 dark:hover:border-gray-500 px-3 py-2.5"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleMemberSelect(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Select a member to assign...</option>
                  {availableMembers
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} (#{member.jerseyNumber}) - {member.position}
                      </option>
                    ))}
                </select>
              )}
              
              {availableMembers.length === 0 && selectedMembers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  No active members available to assign
                </p>
              )}
              
              {availableMembers.length === 0 && selectedMembers.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  All active members have been assigned
                </p>
              )}
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select multiple members who will be responsible for this equipment
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              isLoading={submitting}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {editingItem ? 'Update Item' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Inventory Item Details"
        size="lg"
      >
        {viewingItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Item Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {viewingItem.name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <p className="text-gray-900 dark:text-white capitalize">
                  {viewingItem.category.replace('_', ' ')}
                </p>
              </div>
            </div>

            {viewingItem.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <p className="text-gray-900 dark:text-white">
                  {viewingItem.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Quantity
                </label>
                <p className="text-gray-900 dark:text-white font-bold text-lg">
                  {viewingItem.quantity}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Quantity
                </label>
                <p className="text-gray-900 dark:text-white">
                  {viewingItem.minQuantity}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Quantity
                </label>
                <p className="text-gray-900 dark:text-white">
                  {viewingItem.maxQuantity}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Badge variant={getStatusBadgeVariant(viewingItem.status)} className="capitalize">
                  {viewingItem.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Condition
                </label>
                <Badge variant={getConditionBadgeVariant(viewingItem.condition)} className="capitalize">
                  {viewingItem.condition}
                </Badge>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Storage Location
              </label>
              <div>
                {viewingItem.allocatedMembers && viewingItem.allocatedMembers.length > 0 ? (
                  <div className="space-y-2">
                    {viewingItem.allocatedMembers.map(memberId => {
                      const member = getMemberById(memberId);
                      return member ? (
                        <div key={memberId} className="flex items-center space-x-2">
                          <Badge variant="info" size="sm">
                            {member.name} (#{member.jerseyNumber})
                          </Badge>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {member.position}
                          </span>
                        </div>
                      ) : (
                        <span key={memberId} className="text-sm text-gray-500 dark:text-gray-400">
                          Unknown member
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">
                    No members assigned
                  </span>
                )}
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
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;