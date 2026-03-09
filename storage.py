from prelude import *
import shap
import math
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder

# Path to files with data (models, dataframe, and patients)
BASE_DATA_PATH = 'data'

# 3 entities
# models
# dataframes
# patients
# each contain config but it
#
# Maybe base storage provide base logic and each have storage controller that will modifi this shitt

class ModelStorage:

    # Each tracked storage have each separate config
    def __init__(self, config_path):
        self.config_path = config_path
        self.models = {}
        self._load_config()

    def _load_config(self):
        config = self._read_raw_config()
        for model_config in config.get('models', []):
            try:
                model = Model(
                    model_name=model_config['model_filename'],
                    scaler_name=model_config['scaler_filename'],
                    is_tree=model_config.get('is_tree', True),
                    should_manualy_fill_none=model_config.get('should_manualy_fill_none', False),
                    display_name=model_config.get('display_name', 'NoName'),
                    description=model_config.get('description', 'No desc'),
                    size_of_training_dataset=model_config.get('size_of_training_dataset', 0),
                    fine_tune_group=model_config.get('fine_tune_group', 'default'),
                )
                if model.model is not None:
                    self.models[model_name] = model
            except Exception as e:
                print(f"Error adding model {model_name}: {e}")

    def upload_model(self, model):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        new_model_name = f"{remove_timestamp_from_name(model.model_name)}_{timestamp}"
        filepath = f"{self.BASE_DATAFRAME_PATH}/{new_model_name}.pkl"

        try:
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

    # I can use builder or something like this here
    def get_all_models(self):
        return self.models

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

class Storage:

    # Each tracked storage have each separate config
    def __init__(self, config_path, load_cb):
        self.config_path = config_path
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
        new_model_name = f"{remove_timestamp_from_name(model.model_name)}_{timestamp}"
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
                  is_tree=True, should_manualy_fill_none=False,
                  display_name=None, description=None, fine_tune_group='NoGroup'):
        try:
            model = Model(model_name, scaler_name, size_of_training_dataset,
                          is_tree, should_manualy_fill_none,
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
        return [{'name': remove_timestamp_from_name(name), 'info': model.get_info()}
                for name, model in self.models.items()]

    def get_all_groups(self):
        return {m.fine_tune_group for m in self.models.values() if m.fine_tune_group}

    def get_models_by_group(self, group):
        return [m for m in self.models.values() if m.fine_tune_group == group]

    def fine_tune_group(self, patients, group='NoGroup'):
        if patients is None or len(patients) == 0:
            return []

        models = self.get_models_by_group(group)
        results = []
        for model in models:
            res = model.fine_tune_batch(patients, self.initial_dataframe[group])
            self.upload_model(model)
            results.append({'name': remove_timestamp_from_name(model.model_name), **res})

        if patients:
            pdata = pd.DataFrame([p.patient_data for p in patients])
            if self.initial_dataframe.get(group) is not None:
                updated_df = pd.concat([self.initial_dataframe[group], pdata], ignore_index=True)
            else:
                updated_df = pdata
            self._upload_dataframe(updated_df, group, f"Fine-tuned with {len(patients)} new patients")
        return results
