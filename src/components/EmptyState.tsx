import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export function EmptyState({ message }: { message: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        px: 3,
        py: 4,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <ReceiptLongOutlinedIcon sx={{ fontSize: 48 }} />
      <Typography color="inherit">{message}</Typography>
    </Box>
  )
}
