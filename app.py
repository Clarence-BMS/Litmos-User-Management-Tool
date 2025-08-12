import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
import pandas as pd
import requests
import logging
import json
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
from flask_cors import CORS
from werkzeug.utils import secure_filename
from io import StringIO

# Configure application
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "litmos-user-management-key")
CORS(app)

# Litmos API configuration
API_KEY = os.environ.get("LITMOS_API_KEY", "")
BASE_URL = "https://api.litmos.com/v1.svc"
SOURCE = "sourceapp"  # Required to avoid 401 error from Litmos API

def get_headers():
    return {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "apikey": API_KEY
    }

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/activation")
def activation_page():
    return render_template("activation.html")

@app.route("/deactivation")
def deactivation_page():
    return render_template("deactivation.html")

@app.route("/results")
def results_page():
    results = session.get('results', [])
    operation_type = session.get('operation_type', 'Unknown')
    return render_template("results.html", results=results, operation_type=operation_type)

@app.route("/api/process-csv", methods=["POST"])
def process_csv():
    try:
        operation_type = request.form.get("operation_type")
        if 'csv_file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['csv_file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if file.filename and not file.filename.lower().endswith('.csv'):
            return jsonify({"error": "File must be CSV format"}), 400

        csv_content = file.read().decode('utf-8')
        df = pd.read_csv(StringIO(csv_content))

        if 'username' not in df.columns:
            return jsonify({"error": "CSV must contain a 'username' column"}), 400

        usernames = df['username'].tolist()
        results = []

        for username in usernames:
            if operation_type == "activation":
                result = activate_user(username)
            elif operation_type == "deactivation":
                result = deactivate_user(username)
            else:
                return jsonify({"error": "Invalid operation type"}), 400
            results.append(result)

        session['results'] = results
        session['operation_type'] = "Activation" if operation_type == "activation" else "Deactivation"
        return jsonify({"success": True, "results": results})

    except Exception as e:
        logger.error(f"Error processing CSV: {str(e)}")
        return jsonify({"error": str(e)}), 500

def sanitize_user_data(user_data, active_status):
    allowed = ["Id", "FirstName", "LastName", "Email", "Active", "UserName"]
    clean = {k: user_data[k] for k in allowed if k in user_data}
    clean["Active"] = active_status
    return clean

def activate_user(username):
    try:
        user_url = f"{BASE_URL}/users?source={SOURCE}&search={username}&format=json"
        response = requests.get(user_url, headers=get_headers())

        if response.status_code != 200:
            return {"username": username, "success": False, "message": f"Failed to find user: {response.text}"}

        users = response.json()
        user = next((u for u in users if u.get("UserName", "").lower() == username.lower()), None)

        if not user:
            return {"username": username, "success": False, "message": "User not found"}

        user_id = user.get("Id")

        if user.get("Active", False):
            return {"username": username, "success": False, "message": "Error: User is already active. Duplicate activation attempt."}

        details_url = f"{BASE_URL}/users/{user_id}?source={SOURCE}&format=json"
        get_response = requests.get(details_url, headers=get_headers())

        if get_response.status_code != 200:
            return {"username": username, "success": False, "message": f"Failed to get user details: {get_response.text}"}

        user_data = get_response.json()
        update_data = sanitize_user_data(user_data, True)

        logger.debug(f"Activation payload: {json.dumps(update_data)}")

        update_response = requests.put(details_url, headers=get_headers(), data=json.dumps(update_data))

        if update_response.status_code in [200, 201, 204]:
            return {"username": username, "success": True, "message": "User activated successfully"}
        else:
            return {"username": username, "success": False, "message": f"Failed to activate user: {update_response.text}"}

    except Exception as e:
        logger.error(f"Error activating user {username}: {str(e)}")
        return {"username": username, "success": False, "message": f"Error: {str(e)}"}

def deactivate_user(username):
    try:
        user_url = f"{BASE_URL}/users?source={SOURCE}&search={username}&format=json"
        response = requests.get(user_url, headers=get_headers())

        if response.status_code != 200:
            return {"username": username, "success": False, "message": f"Failed to find user: {response.text}"}

        users = response.json()
        user = next((u for u in users if u.get("UserName", "").lower() == username.lower()), None)

        if not user:
            return {"username": username, "success": False, "message": "User not found"}

        user_id = user.get("Id")

        if not user.get("Active", True):
            return {"username": username, "success": False, "message": "Error: User is already inactive. Duplicate deactivation attempt."}

        # Get full user details
        details_url = f"{BASE_URL}/users/{user_id}?source={SOURCE}&format=json"
        get_response = requests.get(details_url, headers=get_headers())
        if get_response.status_code != 200:
            return {"username": username, "success": False, "message": f"Failed to get user details: {get_response.text}"}

        user_data = get_response.json()

        # Deactivate user and clear custom fields
        update_data = sanitize_user_data(user_data, False)
        update_data["Region"] = ""
        update_data["Area"] = ""
        update_data["Country"] = ""

        logger.debug(f"Deactivation payload: {json.dumps(update_data)}")
        update_response = requests.put(details_url, headers=get_headers(), data=json.dumps(update_data))

        if update_response.status_code not in [200, 201, 204]:
            return {"username": username, "success": False, "message": f"Failed to deactivate user: {update_response.text}"}

        # Remove user from all teams
        teams_url = f"{BASE_URL}/users/{user_id}/teams?source={SOURCE}&format=json"
        teams_response = requests.get(teams_url, headers=get_headers())
        if teams_response.status_code == 200:
            teams = teams_response.json()
            for team in teams:
                team_id = team.get("Id")
                remove_url = f"{BASE_URL}/teams/{team_id}/users/{user_id}?source={SOURCE}"
                remove_response = requests.delete(remove_url, headers=get_headers())
                if remove_response.status_code not in [200, 204]:
                    logger.warning(f"Failed to remove user {username} from team {team_id}: {remove_response.text}")
        else:
            logger.warning(f"Failed to retrieve teams for user {username}: {teams_response.text}")

        return {
            "username": username,
            "success": True,
            "message": "User deactivated, removed from all teams, and profile data cleared"
        }

    except Exception as e:
        logger.error(f"Error deactivating user {username}: {str(e)}")
        return {"username": username, "success": False, "message": f"Error: {str(e)}"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
