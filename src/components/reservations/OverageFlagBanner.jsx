import Alert from '../ui/Alert.jsx'

export default function OverageFlagBanner({ checkedInCount }) {
  return (
    <Alert type="warning">
      <strong>Weekly limit reached.</strong> You've used {checkedInCount} of 3 play sessions this week.
      You can still reserve, but this reservation will be flagged as an overage.
    </Alert>
  )
}
