#!/bin/sh
# Runs on the Proxmox host every minute (cron). Pushes one heartbeat per resource to
# Uptime Kuma "Push" monitors. Kuma alerts on status=down, and also if pushes stop
# entirely (host dead). Tokens live in /etc/kuma-push.env, not in git:
#   KUMA_URL=http://192.168.110.212:3001
#   TOK_RAM=... TOK_DISK=... TOK_POOL=... TOK_TEMP=... TOK_SWAP=...
PATH=/usr/sbin:/sbin:$PATH  # cron's PATH lacks lvs
. /etc/kuma-push.env

# push TOKEN "ok-condition exit code" "message"
push() {
  [ -n "$1" ] || return 0
  if [ "$2" -eq 0 ]; then s=up; else s=down; fi
  curl -fsS -m 10 -G "$KUMA_URL/api/push/$1" --data-urlencode "status=$s" --data-urlencode "msg=$3" >/dev/null
}

ram_avail=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
swap_used=$(awk '/SwapTotal/ {t=$2} /SwapFree/ {f=$2} END {print int((t-f)/1024)}' /proc/meminfo)
disk=$(df --output=pcent / | tail -1 | tr -dc 0-9)
pool=$(lvs --noheadings -o data_percent pve/data | cut -d. -f1 | tr -dc 0-9)
temp=$(( $(cat /sys/class/thermal/thermal_zone*/temp | sort -n | tail -1) / 1000 ))

# thresholds: RAM avail < 700MB, swap > 1GB, root/pool > 85%, temp > 80C
push "$TOK_RAM"  $([ "$ram_avail" -ge 700 ]; echo $?) "avail ${ram_avail}MB"
push "$TOK_SWAP" $([ "$swap_used" -le 1024 ]; echo $?) "swap ${swap_used}MB"
push "$TOK_DISK" $([ "$disk" -le 85 ]; echo $?) "root ${disk}%"
push "$TOK_POOL" $([ "$pool" -le 85 ]; echo $?) "thinpool ${pool}%"
push "$TOK_TEMP" $([ "$temp" -le 80 ]; echo $?) "${temp}C"
