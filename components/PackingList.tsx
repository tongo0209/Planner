import React, { useState } from 'react';
import { PackingItem } from '../types';
import { Card, Input, Button, Modal, Spinner } from './ui';
import { ClipboardIcon, PlusIcon, SparklesIcon } from './icons';
import { suggestPackingItems } from '../services/geminiService';

interface PackingListProps {
  initialItems: PackingItem[];
  isAdmin: boolean;
  tripDestination: string;
  tripDuration: number;
  onUpdateItems: (updatedItems: PackingItem[]) => void;
}

const PackingList: React.FC<PackingListProps> = ({ initialItems, isAdmin, tripDestination, tripDuration, onUpdateItems }) => {
  const [items, setItems] = useState<PackingItem[]>(initialItems);
  const [newItem, setNewItem] = useState('');
  
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<PackingItem | null>(null);

  const [isAISuggestModalOpen, setIsAISuggestModalOpen] = useState(false);
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{item: string}[]>([]);
  const [activities, setActivities] = useState('');

  const handleAddItem = () => {
    if (newItem.trim()) {
      const updatedItems = [...items, { id: Date.now().toString(), item: newItem.trim(), packed: false }];
      setItems(updatedItems);
      onUpdateItems(updatedItems);
      setNewItem('');
    }
  };
  
  const handleStartEditing = (item: PackingItem) => {
    setEditingItem({ ...item });
  };

  const handleCancelEditing = () => {
    setEditingItem(null);
  };

  const handleSaveEditing = () => {
    if (editingItem) {
        const updatedItems = items.map(item => item.id === editingItem.id ? editingItem : item);
        setItems(updatedItems);
        onUpdateItems(updatedItems);
        setEditingItem(null);
    }
  };

  const confirmDeleteItem = () => {
    if (itemToDelete) {
        const updatedItems = items.filter(item => item.id !== itemToDelete.id);
        setItems(updatedItems);
        onUpdateItems(updatedItems);
        setItemToDelete(null);
    }
  };

  const handleGetAISuggestions = async () => {
    if (!activities) return;
    setIsAISuggesting(true);
    setAiSuggestions([]);
    const suggestions = await suggestPackingItems(tripDestination, tripDuration, activities);
    setAiSuggestions(suggestions);
    setIsAISuggesting(false);
  };

  const addSuggestionToPackingList = (suggestionItem: string) => {
    if (suggestionItem.trim() && !items.some(i => i.item.toLowerCase() === suggestionItem.trim().toLowerCase())) {
      const updatedItems = [...items, { id: Date.now().toString(), item: suggestionItem.trim(), packed: false }];
      setItems(updatedItems);
      onUpdateItems(updatedItems);
      setAiSuggestions(prev => prev.filter(s => s.item !== suggestionItem));
    }
  };


  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
            <ClipboardIcon className="w-6 h-6 text-indigo-300" />
            <h3 className="text-xl font-bold text-white">Danh sách đồ dùng</h3>
        </div>
        {isAdmin && (
            <Button onClick={() => setIsAISuggestModalOpen(true)} variant="secondary" size="sm">
                <SparklesIcon className="w-4 h-4" /> Gợi ý AI
            </Button>
        )}
      </div>
      
      <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
        {items.map(item => (
          <div key={item.id} className="bg-gray-700/50 p-3 rounded-lg group">
             {editingItem && editingItem.id === item.id ? (
                <div className="flex gap-2">
                    <Input 
                        value={editingItem.item}
                        onChange={e => setEditingItem({...editingItem, item: e.target.value})}
                        className="flex-grow text-sm"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveEditing()}
                    />
                    <Button onClick={handleSaveEditing} size="sm">Lưu</Button>
                    <Button onClick={handleCancelEditing} variant="secondary" size="sm">Hủy</Button>
                </div>
            ) : (
                <div className="flex justify-between items-center">
                    <span className="text-gray-200">{item.item}</span>
                    {isAdmin && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleStartEditing(item)} className="text-xs text-yellow-400 hover:text-yellow-300">Sửa</button>
                            <button onClick={() => setItemToDelete(item)} className="text-xs text-red-400 hover:text-red-300">Xóa</button>
                        </div>
                    )}
                </div>
            )}
          </div>
        ))}
         {items.length === 0 && (
            <div className="text-center py-6 text-gray-500">
                <ClipboardIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Danh sách đồ dùng trống</p>
                <p className="text-sm">Thêm vật dụng hoặc dùng gợi ý từ AI!</p>
            </div>
        )}
      </div>

      {isAdmin && (
          <div className="flex gap-2">
              <Input 
                  placeholder="Thêm đồ dùng mới..." 
                  value={newItem} 
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                  className="flex-grow"
              />
              <Button onClick={handleAddItem}><PlusIcon className="w-5 h-5" /></Button>
          </div>
      )}
    
    <Modal isOpen={isAISuggestModalOpen} onClose={() => setIsAISuggestModalOpen(false)} title="Trợ lý đóng gói AI">
        <div className="space-y-4">
          <Input 
            label="Các hoạt động dự kiến là gì?"
            placeholder="v.d., đi biển, leo núi, tham quan thành phố"
            value={activities}
            onChange={(e) => setActivities(e.target.value)}
          />
          <Button onClick={handleGetAISuggestions} className="w-full" disabled={isAISuggesting || !activities}>
            {isAISuggesting ? <Spinner /> : <><SparklesIcon className="w-5 h-5"/> Tạo gợi ý</>}
          </Button>
          {aiSuggestions.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pt-4 mt-4 border-t border-gray-700">
              <h4 className="font-semibold text-gray-200">Gợi ý:</h4>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-center">
                  <p className="text-white">{s.item}</p>
                  <Button variant="ghost" onClick={() => addSuggestionToPackingList(s.item)} title="Thêm vào danh sách">
                    <PlusIcon className="w-5 h-5"/>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
    </Modal>

    {itemToDelete && (
        <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Xác nhận xóa đồ dùng">
            <div className="space-y-4 text-gray-300">
                <p>Bạn có chắc chắn muốn xóa <strong className="text-white">{itemToDelete.item}</strong> khỏi danh sách không?</p>
                <div className="flex justify-end gap-4 pt-4">
                    <Button variant="secondary" onClick={() => setItemToDelete(null)}>Hủy</Button>
                    <Button variant="primary" className="!bg-red-600 hover:!bg-red-500" onClick={confirmDeleteItem}>
                        Xác nhận Xóa
                    </Button>
                </div>
            </div>
        </Modal>
    )}
    </Card>
  );
};

export default PackingList;
