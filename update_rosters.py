import csv
import json
import os
import requests
from pathlib import Path

BASE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2z2qeTV7pdgq6l1_B8AHdr6ysBIoTy0v2zE20o54IqoRKX2J8hZw34s0rv2akIKZqMTQHv3BtOdv4/pub'
SHEET_MAPPINGS = {
    'Maple Leafs': '1499474245',
    'Canadiens': '1883457933',
    'Bruins': '854028421',
    'Red Wings': '335533588'
}

def fetch_team_roster(team):
    try:
        gid = SHEET_MAPPINGS[team]
        team_url = f"{BASE_SHEET_URL}?gid={gid}&single=true&output=csv"
        print(f"Fetching {team} roster from: {team_url}")
        
        response = requests.get(team_url)
        response.raise_for_status()
        
        data = response.text
        print(f"Raw {team} data: {data}")
        
        lines = data.split('\n')
        players = []
        in_player_section = False
        
        # Process each line
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Skip rows that start with "Coach"
            if line.lower().startswith('coach'):
                print(f"Skipping coach row: {line}")
                continue
            
            # Look for the start of player stats section
            if 'Player #,Player Name,Goals' in line:
                in_player_section = True
                continue
            
            # Skip if we're not in the player stats section
            if not in_player_section:
                continue
            
            # Parse player stats
            fields = line.split(',')
            if len(fields) < 2:
                continue
                
            number, name = fields[0].strip(), fields[1].strip()
            
            # Skip header rows or invalid data
            if not number or not name or name.lower() == 'player name':
                print(f"Skipping invalid row: {line}")
                continue
            
            # Check if player is a goalie
            is_goalie = '(G)' in name
            clean_name = name.replace('(G)', '').strip()
            
            players.append({
                'number': int(number) if number.isdigit() else 0,
                'name': clean_name,
                'isGoalie': is_goalie,
                'goals': 0,
                'saves': 0 if is_goalie else None
            })
        
        print(f"Parsed {len(players)} players for {team}: {players}")
        return players
    except Exception as error:
        print(f"Error fetching {team} roster: {error}")
        return []

def update_rosters():
    try:
        teams = ['Maple Leafs', 'Canadiens', 'Bruins', 'Red Wings']
        all_player_data = {
            'lastUpdated': None,  # Will be set when saving
            'teams': {}
        }

        for team in teams:
            players = fetch_team_roster(team)
            all_player_data['teams'][team] = {'players': players}

        # Ensure static/data directory exists
        data_dir = Path('static/data')
        data_dir.mkdir(parents=True, exist_ok=True)

        # Update timestamp
        all_player_data['lastUpdated'] = requests.get('http://worldtimeapi.org/api/ip').json()['datetime']

        # Save to static/data/rosters.json
        output_path = data_dir / 'rosters.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(all_player_data, f, indent=4)
        print('Successfully updated static/data/rosters.json')
    except Exception as error:
        print(f"Error updating rosters: {error}")

if __name__ == '__main__':
    update_rosters() 