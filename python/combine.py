from datetime import datetime
import os

# List of directories to process
directories = ['app', 'components', 'hooks', 'lib', 'types', 'utils']

# Setting the project root directory
project_root = '../'

# Symbols to use as comments
comment_symbol = '//'

def collect_files(directory):
    file_paths = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                file_paths.append(os.path.join(root, file))
    return file_paths

def create_combined_file(file_paths, output_file):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for file_path in file_paths:
            relative_path = os.path.relpath(file_path, start=os.path.dirname(output_file))
            outfile.write(f"{comment_symbol} {relative_path}\n")
            
            with open(file_path, 'r', encoding='utf-8') as infile:
                outfile.write(infile.read())
            
            outfile.write("\n\n\n")

# Collect all file paths
all_files = []
for directory in directories:
    dir_path = os.path.join(project_root, directory)
    if os.path.exists(dir_path):
        all_files.extend(collect_files(dir_path))

# Sort file paths to ensure consistent order
all_files.sort()

# Generate file names based on the current time
current_time = datetime.now().strftime('%y%m%d_%H%M%S')
output_file = f'{current_time}.combined.ts'

# Create a combined file
create_combined_file(all_files, output_file)

print(f"Combined file created: {output_file}")