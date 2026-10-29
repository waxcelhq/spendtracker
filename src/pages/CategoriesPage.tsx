import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useLedger } from '../db/useLedger'
import type { Category } from '../db/types'
import { createCategory, deleteCategory, renameCategory } from '../lib/categories'

export function CategoriesPage() {
  const { categories } = useLedger()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')

  if (!categories) return null

  async function add() {
    const result = await createCategory(name)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setName('')
    setError('')
  }

  async function saveRename() {
    if (!editing) return
    const message = await renameCategory(editing.id, renameValue)
    if (message) {
      setRenameError(message)
      return
    }
    setEditing(null)
  }

  async function remove(id: string) {
    const message = await deleteCategory(id)
    setBlocked(message ?? '')
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); void add() }} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          label="Category"
          value={name}
          fullWidth
          error={error !== ''}
          helperText={error}
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
        />
        <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start', mt: 1, whiteSpace: 'nowrap' }}>
          New category
        </Button>
      </Box>

      {blocked && (
        <Typography sx={{ mt: 2, color: 'error.main' }}>{blocked}</Typography>
      )}

      {categories.length === 0 ? (
        <Typography sx={{ mt: 3, color: 'text.secondary' }}>No categories</Typography>
      ) : (
        <List disablePadding sx={{ mt: 1 }}>
          {categories.map((category) => (
            <ListItem
              key={category.id}
              disablePadding
              secondaryAction={
                <Box>
                  <IconButton
                    aria-label={`Rename ${category.name}`}
                    onClick={() => {
                      setEditing(category)
                      setRenameValue(category.name)
                      setRenameError('')
                    }}
                  >
                    <EditOutlinedIcon />
                  </IconButton>
                  <IconButton aria-label={`Delete ${category.name}`} onClick={() => void remove(category.id)}>
                    <DeleteOutlinedIcon />
                  </IconButton>
                </Box>
              }
              sx={{ pr: 12 }}
            >
              <ListItemText primary={category.name} />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)}>
        <DialogTitle>Rename category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Category"
            margin="dense"
            value={renameValue}
            error={renameError !== ''}
            helperText={renameError}
            onChange={(event) => {
              setRenameValue(event.target.value)
              setRenameError('')
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button onClick={() => void saveRename()}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
