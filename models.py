from prelude import *
import shap
import math
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder

# TODO:  Move it later in utils ===== 
def filter_array(source_array, reference_array):
    """Фильтрует source_array, оставляя только элементы из reference_array"""
    reference_set = set(reference_array)
    return [item for item in source_array if item in reference_set]

def smart_convert(x):
    if isinstance(x, (int, float)):
        try:
            return int(x) if x == int(x) else x
        except ValueError:
            return x
    if isinstance(x, str) and x.lstrip('-').replace('.', '', 1).isdigit():
        f = float(x)
        return int(f) if f == int(f) else f
    return x

# ========== 

# data prepare part

# order of names is important
INITIAL_FEASTURES_NAMES = [
        'age_onset', 'heredity', 'smoking_status', 'sex',
        'us1_thyroid_volume', 'us1_nodules', 'us1_nodules_cm',
        'tsh_1', 'ft4_1', 'ft3_1', 'ft3_to_ft4_ratio',
        'exophthalmos', 'thyrotoxic_cardiomyopathy'
]

READMISSION_FEATURE_NAMES = [
        'treatment_type', 'tsh_3', 'us3_thyroid_volume', 'us3_nodules', 'us3_nodules_cm'
]

# order of names still important
ALL_FEATURE_NAMES = INITIAL_FEASTURES_NAMES + READMISSION_FEATURE_NAMES

# Define categorical and numerical columns
CATEGORICAL_COLS = [
    "heredity",
    "smoking_status", 
    "sex",
    "us1_nodules",
    "exophthalmos",
    "thyrotoxic_cardiomyopathy",
    "treatment_type", 
    "us3_nodules"
]

# Identify numerical columns (all columns not in CATEGORICAL_COLS)
NUM_COLS = [col for col in ALL_FEATURE_NAMES if col not in CATEGORICAL_COLS]

# Helper function to load ML model (for future use)
def load_ml_model(model_path, scaler_path):
    """
    Load ML model and scaler from pickle files.
    """
    try:
        with open(model_path, 'rb') as model_file:
            model = joblib.load(model_file)
        
        scaler = None
        if os.path.exists(scaler_path):
            with open(scaler_path, 'rb') as scaler_file:
                scaler = joblib.load(scaler_file)
        
        return model, scaler
    except FileNotFoundError:
        print(f"Model files not found at {model_path}")
        return None, None
    except Exception as e:
        print(f"Error loading model: {str(e)}")
        return None, None

def extract_features(data, features_names_list, fill_type=np.nan):
    features = []
    for name in features_names_list:
        value = data.get(name)
        if value is None or value == "":
            features.append(fill_type)
        else:
            features.append(value)
    return features

def prepare_features(features, scaler, features_names_list, fill_none=False):
    # Create DataFrame with proper column names
   
    features_df = pd.DataFrame(features, columns=features_names_list)
    if fill_none:
        # if nesseccary to fill None by hands
        numerical_cols_names = filter_array(NUM_COLS, features_names_list)
        # Convert to numpy array for prediction
        if scaler is not None:
            # Scale only numerical columns
            features_df[numerical_cols_names] = scaler.transform(features_df[numerical_cols_names])

        # Convert to numpy array for prediction
        return features_df.values

    # if None processing already in processor - do nothing else
    return scaler.transform(features_df)

REQUIRED_CLASSES = {0, 1}

def fit_with_new_data_alone(model, X_data, y_data, error_message):
    print(f"Error fitting with presaved data {error_message}! Refitted with new data!")

    if not REQUIRED_CLASSES.issubset(set(y_data)):
        # TODO: architecture should be changed to add possibility for unmarking in such case 
        print(f"Skipping fit: y only contains classes {np.unique(y_data)}, need {REQUIRED_CLASSES}")
        return []
    else:
        model.fit(X_data, y_data)
        return y_data

#TODO: params list should be reworked (many places now to repeat)
class Model:
    def __init__(self, model_name, scaler_name, size_of_training_dataset,
                 is_initial, is_tree, should_manualy_fill_none, display_name="NoName",
                 description="No description", fine_tune_group="NoGroup"):
        self.model_name = model_name
        self.scaler_name = scaler_name
        # If models only for inital_cases - it works withanother set of params
        self.is_initial = is_initial
        self.all_features_names = INITIAL_FEASTURES_NAMES if is_initial else ALL_FEATURE_NAMES
        self.should_manualy_fill_none = should_manualy_fill_none
        self.description = description
        self.display_name = display_name if display_name != "NoName" else model_name
        self.size_of_training_dataset = size_of_training_dataset
        self.fine_tune_group = fine_tune_group
        self.target_column_name = 'no_remission'
        self._load(is_tree)

    def _gen_paths(self, base='models'):
        # Think about extensions
        return (os.path.join(base, self.model_name + '.pkl'), os.path.join(base, self.scaler_name + '.pkl'))

    # TODO: is_tree must be in another place
    def _load(self, is_tree):
        (model_path, scaler_path) = self._gen_paths() 
        self.model, self.scaler = load_ml_model(model_path, scaler_path)
        self.explainer = shap.Explainer(self.model)
        self.explainer = None

    def get_info(self):
        return {
            'display_name': self.display_name,
            'description': self.description,
            'size_of_training_dataset': self.size_of_training_dataset,
            'type': 'init' if self.is_initial else 'follow-up',
        }

    def _explain(self, features_array):
        shap_values = self.explainer.shap_values(features_array)

        if len(shap_values.shape) == 2:  # Single class format
            # Already single class - xgboost explainer
            base_value = self.explainer.expected_value
            # Convert to probability effects (approximation)
            shap_values_positive  = shap_values * np.exp(-base_value) / (1 + np.exp(-base_value))**2
        elif len(shap_values.shape) == 3:  # Multi-class format
            shap_values_positive = shap_values[:, :, 1]  # Positive class only
        
        explanation = {}
        for i, feature in enumerate(self.all_features_names):
            shap_effect = float(shap_values_positive[0, i])
            
            explanation[feature] = {
                'value': float(features_array[0, i]),
                'shap_effect': shap_effect,
                'scaled_importance': float(abs(shap_effect)),
            }
        
        # Sort by absolute impact on positive class
        sorted_features = sorted(
            explanation.items(), 
            key=lambda x: abs(x[1]['shap_effect']), 
            reverse=True
        )
        
        # Get base value
        base_value = 0.0
        if hasattr(self.explainer, 'expected_value'):
            ev = self.explainer.expected_value
            if isinstance(ev, np.ndarray) and ev.shape == (2,):
                base_value = float(ev[1])  # Positive class base value

        return {
            'sorted_features': sorted_features,
            'base_value': base_value
        }

    def predict(self, data):
        features_array = prepare_features([extract_features(data, self.all_features_names)], self.scaler, self.all_features_names, self.should_manualy_fill_none)

        # Make prediction
        prediction = self.model.predict(features_array)
        probability = self.model.predict_proba(features_array)

        if self.explainer is None:
            return {
                'prediction': prediction.tolist()[0],
                'probability': probability.tolist()[0][1],
            }

        explanation = self._explain(features_array)
        return {
            'prediction': prediction.tolist()[0],
            'probability': probability.tolist()[0][1],
            'feature_contributions': dict(explanation['sorted_features']),
            'base_value': explanation['base_value'],
        }

    def _fine_tune_batch(self, patients):
        new_count = len(patients)
        self.size_of_training_dataset += new_count
        # TODO: implement actual model retraining here.
        return {'new_dataset_size': self.size_of_training_dataset, 'added': new_count}

    def fine_tune_batch(self, patients, init_df):
        if not patients:
            return {'new_dataset_size': self.size_of_training_dataset, 'added': 0}

        X_list = []
        y_list = []
        for p in patients:
            pdata = p.patient_data

            # FIXME: by design this patients must feat requirements of models so this check is redundat
            #
            # skip if no label (defensive, though storage should filter them already)
            if pdata.get(self.target_column_name) is None:
                continue

            pdata = {k: smart_convert(v) for k, v in pdata.items()}

            feats = extract_features(pdata, self.all_features_names)

            X_list.append(feats)
            y_list.append(pdata[self.target_column_name])

        if not X_list:
            return {'new_dataset_size': self.size_of_training_dataset, 'added': 0}

        # apply preprocessor
        X_prepared = prepare_features(X_list, self.scaler, self.all_features_names,
                                    self.should_manualy_fill_none)
        y = np.array(y_list, dtype=int)

        # can partial_fit
        if hasattr(self.model, 'partial_fit'):
            # sklearn workaround
            classes = np.array([0, 1], dtype=int)
            try:
                self.model.partial_fit(X_prepared, y, classes=classes)
            except TypeError:
                self.model.partial_fit(X_prepared, y)
        # must be fully refited
        else:
            if init_df is None or init_df.empty or not self.target_column_name in init_df:
                y_list = fit_with_new_data_alone(self.model, X_prepared, y, "no data provided!")
            else:
                try:
                    pdata_first = init_df[self.all_features_names].values.tolist()
                    pdata = [[smart_convert(item) for item in sublist] for sublist in pdata_first]
                    X_original = prepare_features(
                        pdata, self.scaler, self.all_features_names, self.should_manualy_fill_none
                    )
                    y_original = init_df[self.target_column_name].values

                    # combine original and new data
                    X_combined = np.vstack([X_original, X_prepared])
                    y_combined = np.hstack([y_original, y])

                    self.model.fit(X_combined, y_combined)
                except Exception as e:
                    y_list = fit_with_new_data_alone(self.model, X_prepared, y, e)
                    raise

        # rebuild SHAP explainer
        try:
            self.explainer = shap.Explainer(self.model)
        except Exception:
            self.explainer = None

        added = len(y_list)
        self.size_of_training_dataset += added

        return {'new_dataset_size': self.size_of_training_dataset, 'added': added}

#TODO: add save fine_tuned model code

class ModelsStorage:
    BASE_DATAFRAME_PATH = 'models'
    BASE_DATAFRAME_NAME = 'base_dataframe.pkl'

    def __init__(self, config_path):
        self.config_path = config_path
        self.models = {}
        self.initial_dataframe = {}
        self._load_config()
        self._load_initial_dataframes()

    def _read_raw_config(self):
        try:
            with open(self.config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Config file {self.config_path} not found")
        except Exception as e:
            print(f"Error reading config: {e}")
        return {}

    def _write_raw_config(self, config: dict):
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Error writing config: {e}")
            return False

    def _load_config(self):
        config = self._read_raw_config()
        for model_config in config.get('models', []):
            self.add_model(
                model_name=model_config['model_filename'],
                scaler_name=model_config['scaler_filename'],
                is_initial=model_config.get('is_initial', False),
                is_tree=model_config.get('is_tree', True),
                should_manualy_fill_none=model_config.get('should_manualy_fill_none', False),
                display_name=model_config.get('display_name', 'NoName'),
                description=model_config.get('description', 'No desc'),
                size_of_training_dataset=model_config.get('size_of_training_dataset', 0),
                fine_tune_group=model_config.get('fine_tune_group', 'default'),
            )

    def _load_initial_dataframes(self):
        all_groups = self.get_all_groups()
        for group in all_groups:
            self._load_initial_dataframe(group)

    def _load_initial_dataframe(self, group=""):
        config = self._read_raw_config()
        history: list = config.get('dataframe_history', [])

        # Try the latest versioned file from history
        if history:
            # TODO: fix this gross
            for el in range(len(history)):
                latest = history[-1 * (el + 1)]
                filename = latest['filename']
                if not group in filename:
                    continue
                filepath = f"{self.BASE_DATAFRAME_PATH}/{filename}"
                if os.path.exists(filepath):
                    try:
                        self.initial_dataframe[group] = pd.read_pickle(filepath)
                        print(f"Loaded dataframe from history: '{filepath}' "
                            f"({latest.get('rows', '?')} rows, saved {latest.get('timestamp', '?')})")
                        return
                    except Exception as e:
                        print(f"Failed to load latest history file '{filepath}': {e}")
            print(f"Failed to load any history file for '{group}'")

        # Fall back to base_dataframe.pkl
        filepath = f"{self.BASE_DATAFRAME_PATH}/{group}_{self.BASE_DATAFRAME_NAME}"
        if os.path.exists(filepath):
            try:
                self.initial_dataframe[group] = pd.read_pickle(filepath)
                print(f"Loaded dataframe from '{filepath}' "
                      f"({len(self.initial_dataframe[group])} rows)")

                # Auto-register base file as the first history entry
                self._upload_dataframe(self.initial_dataframe[group], group, 'Initial base dataframe (auto-registered)')
            except Exception as e:
                print(f"Failed to load '{filepath}': {e}")
        else:
            print(f"No dataframe found. 'initial_dataframe' for {group} remains None.")

    def _append_history_entry(self, config: dict, entry: dict):
        config.setdefault('dataframe_history', []).append(entry)
        self._write_raw_config(config)

    def append_patients(self, patients, group):
        pdata = [p.patient_data for p in patients]
        df = pd.concat([self.initial_dataframe[group], pdata], ignore_index=True)

    def _upload_dataframe(self, new_dataframe: pd.DataFrame, group: str,
                         description: str = ''):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        # TODO: move `models` in base_path section
        filename = f'{group}_dataframe_{timestamp}.pkl'
        filepath = f"{self.BASE_DATAFRAME_PATH}/{filename}"

        try:
            new_dataframe.to_pickle(filepath)
        except Exception as e:
            print(f"Failed to save dataframe to '{filepath}': {e}")
            return None

        prev_rows = len(self.initial_dataframe[group]) if self.initial_dataframe[group] is not None else 0
        added_rows = len(new_dataframe) - prev_rows

        entry = {
            'filename': filename,
            'timestamp': datetime.now().isoformat(timespec='seconds'),
            'description': description,
            'rows': len(new_dataframe),
            'columns': len(new_dataframe.columns),
            'added_rows': added_rows,
        }

        config = self._read_raw_config()
        self._append_history_entry(config, entry)

        self.initial_dataframe[group] = new_dataframe
        print(f"Dataframe updated: '{filename}' "
              f"({len(new_dataframe)} rows, +{added_rows} new)")
        return entry


    def upload_model(self, model):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_model_name = f"{model.model_name}_{timestamp}"
        filepath = f"{self.BASE_DATAFRAME_PATH}/{new_model_name}.pkl"

        try:
            # Assuming joblib is imported via prelude
            joblib.dump(model.model, filepath)
        except Exception as e:
            print(f"Failed to save model to '{filepath}': {e}")
            return None

        config = self._read_raw_config()
        
        # Add to history
        entry = {
            'filename': new_model_name + '.pkl',
            'timestamp': datetime.now().isoformat(timespec='seconds'),
            'dataset_size': model.size_of_training_dataset
        }
        config.setdefault('model_history', []).append(entry)

        # Update the main config so the new version loads on restart
        for m_cfg in config.get('models', []):
            if m_cfg.get('model_filename') == model.model_name:
                m_cfg['model_filename'] = new_model_name
                m_cfg['size_of_training_dataset'] = model.size_of_training_dataset
        
        self._write_raw_config(config)
        model.model_name = new_model_name  # Update name in memory
        print(f"Model updated: '{new_model_name}.pkl'")
        return entry

    def add_model(self, model_name, scaler_name, size_of_training_dataset,
                  is_initial=False, is_tree=True, should_manualy_fill_none=False,
                  display_name=None, description=None, fine_tune_group='NoGroup'):
        try:
            model = Model(model_name, scaler_name, size_of_training_dataset,
                          is_initial, is_tree, should_manualy_fill_none,
                          display_name, description, fine_tune_group)
            if model.model is not None:
                self.models[model_name] = model
                return True
        except Exception as e:
            print(f"Error adding model {model_name}: {e}")
        return False

    def get_model(self, model_name):
        return self.models.get(model_name)

    def get_all_models(self):
        return self.models

    def get_all_models_info(self):
        return [{'name': name, 'info': model.get_info()}
                for name, model in self.models.items()]

    def get_all_groups(self):
        return {m.fine_tune_group for m in self.models.values() if m.fine_tune_group}

    def get_models_by_group(self, group):
        return [m for m in self.models.values() if m.fine_tune_group == group]

    def fine_tune_group(self, patients, group='NoGroup'):
        if not patients:
            return []

        models = self.get_models_by_group(group)
        results = []
        for model in models:
            res = model.fine_tune_batch(patients, self.initial_dataframe[group])
            self.upload_model(model)
            results.append({'name': model.model_name, **res})

        if patients:
            pdata = pd.DataFrame([p.patient_data for p in patients])
            if self.initial_dataframe.get(group) is not None:
                updated_df = pd.concat([self.initial_dataframe[group], pdata], ignore_index=True)
            else:
                updated_df = pdata
            self._upload_dataframe(updated_df, group, f"Fine-tuned with {len(patients)} new patients")
        return results
