from flask import Flask, render_template, request, jsonify
import pickle
import os
import json
import joblib
import pandas as pd
import numpy as np
import warnings
from datetime import datetime
from sklearn.exceptions import InconsistentVersionWarning

warnings.filterwarnings("ignore", category=InconsistentVersionWarning)
