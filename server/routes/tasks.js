import express from 'express';
import { getCollection, insertItem, updateItem, deleteItem } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('leads', 'read'), (req, res) => {
  const { filter, assignee } = req.query;
  let tasks = getCollection('tasks');

  // Agent scoping — agents see their own tasks
  if (req.user?.role === 'agent') {
    const db = getDb();
    const currentUser = (db.users || []).find(u => u.id === req.user.id);
    if (currentUser) {
      tasks = tasks.filter(t => t.assignee === currentUser.name || !t.assignee);
    }
  }

  if (filter === 'my-tasks') {
    const user = assignee || req.user?.name || 'Rohan Mehta';
    tasks = tasks.filter(t => t.assignee === user || !t.assignee);
  } else if (filter === 'overdue') {
    tasks = tasks.filter(t => t.status !== 'completed' && t.due && t.due.includes('Today'));
  } else if (filter === 'today') {
    tasks = tasks.filter(t => t.due && t.due.includes('Today'));
  } else if (filter === 'this-week') {
    tasks = tasks.filter(t => t.status !== 'completed');
  } else if (filter === 'completed') {
    tasks = tasks.filter(t => t.status === 'completed');
  }

  const overdueCount = tasks.filter(t => t.status !== 'completed' && t.due && t.due.includes('Today')).length;
  const todayCount = tasks.filter(t => t.due && t.due.includes('Today') && t.status !== 'completed').length;
  const thisWeekCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  res.json({
    success: true,
    data: tasks,
    stats: {
      overdue: overdueCount,
      today: todayCount,
      thisWeek: thisWeekCount,
      completed: completedCount
    }
  });
});

router.post('/', authorize('leads', 'create'), (req, res) => {
  const { title, contactId, type, priority, due, assignee, description } = req.body;
  if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

  const newTask = {
    title,
    contactId: contactId ? Number(contactId) : null,
    type: type || 'follow-up',
    priority: priority || 'medium',
    due: due || 'Today, 5:00 PM',
    status: 'pending',
    assignee: assignee || 'Rohan Mehta',
    description: description || ''
  };

  const saved = insertItem('tasks', newTask);
  res.status(201).json({ success: true, data: saved });
});

router.put('/:id', authorize('leads', 'update'), (req, res) => {
  const updated = updateItem('tasks', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, data: updated });
});

router.delete('/:id', authorize('leads', 'delete'), (req, res) => {
  const success = deleteItem('tasks', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Task not found' });
  res.json({ success: true, message: 'Task deleted' });
});

export default router;
