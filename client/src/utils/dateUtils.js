export const formatMessageDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date(); // Use local time
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1); // Subtract 1 day

    // Helper to check if same day (ignoring time)
    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    // Simplified: Always return "Day Name/Date, Time" or similar if requested.
    // However, user said "date of message like whatsapp".
    // WhatsApp on list view: Yesterday, Date, or Time (for today).
    // WhatsApp inside chat bubble metadata: Just time (usually).
    // But since user is complaining about "date visibility", they probably want to SEE the date.
    // Let's change it to:
    // Today: "Today, 10:30 AM"
    // Yesterday: "Yesterday, 10:30 AM"
    // Older: "DD/MM/YYYY, 10:30 AM"

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isSameDay(date, now)) {
        return `Today, ${timeStr}`;
    } else if (isSameDay(date, yesterday)) {
        return `Yesterday, ${timeStr}`;
    } else {
        return `${date.toLocaleDateString()}, ${timeStr}`;
    }
};
